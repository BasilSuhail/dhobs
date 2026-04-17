// HomeForge Host Agent
// Statically-linked binary that exposes host metrics over HTTP on :9101
// Dashboard consumes GET /metrics and GET /health (Tier 1 in stats/route.ts)
//
// Build: make build
// Run:   ./homeforge-agent
package main

import (
	"embed"
	"encoding/json"
	"errors"
	"flag"
	"fmt"
	"log"
	stdnet "net"
	"net/http"
	"os"
	"os/exec"
	"path/filepath"
	"runtime"
	"strings"
	"sync"
	"time"

	"github.com/shirou/gopsutil/v3/cpu"
	"github.com/shirou/gopsutil/v3/disk"
	"github.com/shirou/gopsutil/v3/host"
	"github.com/shirou/gopsutil/v3/load"
	"github.com/shirou/gopsutil/v3/mem"
	gopsutilnet "github.com/shirou/gopsutil/v3/net"
)

const (
	port              = ":9101"
	cacheTTL          = 2 * time.Second
	serviceLabel      = "com.homeforge.agent"
	serviceTaskName   = "HomeForge Host Agent"
	defaultAgentLog   = "/tmp/homeforge-agent.log"
	launchAgentRel    = "Library/LaunchAgents/com.homeforge.agent.plist"
	systemdServiceRel = "/etc/systemd/system/homeforge-agent.service"
)

//go:embed init/*
var initTemplates embed.FS

// --- JSON response types (must match dashboard expectations in app/api/stats/route.ts) ---

type CPUMetrics struct {
	Usage   float64   `json:"usage"`
	Load    float64   `json:"load"` // alias for usage — dashboard reads cpu.load
	LoadAvg []float64 `json:"loadAvg"`
	Cores   int       `json:"cores"`
}

type MemMetrics struct {
	Total    uint64  `json:"total"`
	Free     uint64  `json:"free"`
	Used     uint64  `json:"used"`
	UsedPerc float64 `json:"usedPerc"`
}

type DiskInfo struct {
	Mount   string  `json:"mount"`
	Total   uint64  `json:"total"`
	Used    uint64  `json:"used"`
	Free    uint64  `json:"free"`
	UsePerc float64 `json:"usePerc"`
}

type NetMetrics struct {
	RxBytes  uint64 `json:"rxBytes"`
	TxBytes  uint64 `json:"txBytes"`
	RxErrors uint64 `json:"rxErrors"`
	TxErrors uint64 `json:"txErrors"`
}

type TempMetrics struct {
	CPU *float64 `json:"cpu"`
	Sys *float64 `json:"sys"`
}

type AgentMetrics struct {
	Platform  string      `json:"platform"`
	Hostname  string      `json:"hostname"`
	Uptime    uint64      `json:"uptime"`    // seconds
	CPU       CPUMetrics  `json:"cpu"`
	Memory    MemMetrics  `json:"memory"`
	Disk      []DiskInfo  `json:"disk"`
	Network   NetMetrics  `json:"network"`
	Temps     TempMetrics `json:"temps"`
	LoadAvg   []float64   `json:"loadAvg"` // top-level — dashboard reads agentData.loadAvg[0..2]
	Timestamp int64       `json:"timestamp"`
}

// --- Cache ---

type cache struct {
	mu      sync.Mutex
	data    *AgentMetrics
	updated time.Time
}

var metricsCache = &cache{}

func (c *cache) get() (*AgentMetrics, bool) {
	c.mu.Lock()
	defer c.mu.Unlock()
	if c.data != nil && time.Since(c.updated) < cacheTTL {
		return c.data, true
	}
	return nil, false
}

func (c *cache) set(m *AgentMetrics) {
	c.mu.Lock()
	defer c.mu.Unlock()
	c.data = m
	c.updated = time.Now()
}

// --- Metric collectors ---

func collectCPU() (CPUMetrics, []float64) {
	cores, _ := cpu.Counts(true)

	percents, err := cpu.Percent(500*time.Millisecond, false)
	usage := 0.0
	if err == nil && len(percents) > 0 {
		usage = round1(percents[0])
	}

	var loadAvg []float64
	if avg, err := load.Avg(); err == nil {
		loadAvg = []float64{round1(avg.Load1), round1(avg.Load5), round1(avg.Load15)}
	} else {
		loadAvg = []float64{0, 0, 0}
	}

	return CPUMetrics{
		Usage:   usage,
		Load:    usage,
		LoadAvg: loadAvg,
		Cores:   cores,
	}, loadAvg
}

func collectMemory() MemMetrics {
	v, err := mem.VirtualMemory()
	if err != nil {
		return MemMetrics{}
	}
	return MemMetrics{
		Total:    v.Total,
		Free:     v.Available,
		Used:     v.Used,
		UsedPerc: round1(v.UsedPercent),
	}
}

func collectDisk() []DiskInfo {
	partitions, err := disk.Partitions(false)
	if err != nil {
		return nil
	}

	var disks []DiskInfo
	seenMount := map[string]bool{}
	seenSig := map[string]bool{} // dedup macOS system volumes by total+used

	for _, p := range partitions {
		if seenMount[p.Mountpoint] {
			continue
		}
		if isVirtualFS(p.Fstype) {
			continue
		}
		// Skip macOS system volumes under /System/Volumes/
		if len(p.Mountpoint) > 16 && p.Mountpoint[:16] == "/System/Volumes/" {
			continue
		}
		seenMount[p.Mountpoint] = true

		usage, err := disk.Usage(p.Mountpoint)
		if err != nil || usage.Total == 0 {
			continue
		}

		// Dedup volumes with identical total+used (same underlying device)
		sig := fmt.Sprintf("%d:%d", usage.Total, usage.Used)
		if seenSig[sig] {
			continue
		}
		seenSig[sig] = true

		disks = append(disks, DiskInfo{
			Mount:   p.Mountpoint,
			Total:   usage.Total,
			Used:    usage.Used,
			Free:    usage.Free,
			UsePerc: round1(usage.UsedPercent),
		})
	}
	return disks
}

func isVirtualFS(fstype string) bool {
	virtual := map[string]bool{
		"tmpfs": true, "devtmpfs": true, "devfs": true, "overlay": true,
		"sysfs": true, "proc": true, "cgroup": true, "cgroup2": true,
		"pstore": true, "bpf": true, "tracefs": true, "debugfs": true,
		"securityfs": true, "hugetlbfs": true, "mqueue": true,
		"fusectl": true, "autofs": true, "squashfs": true,
	}
	return virtual[fstype]
}

func collectNetwork() NetMetrics {
	counters, err := gopsutilnet.IOCounters(false) // false = aggregate all interfaces
	if err != nil || len(counters) == 0 {
		return NetMetrics{}
	}
	c := counters[0]
	return NetMetrics{
		RxBytes:  c.BytesRecv,
		TxBytes:  c.BytesSent,
		RxErrors: c.Errin,
		TxErrors: c.Errout,
	}
}

func collectTemps() TempMetrics {
	sensors, err := host.SensorsTemperatures()
	if err != nil || len(sensors) == 0 {
		return TempMetrics{}
	}

	var cpuTemp *float64
	var maxTemp *float64

	for _, s := range sensors {
		if s.Temperature <= 0 {
			continue
		}
		t := round1(s.Temperature)
		// Track overall max
		if maxTemp == nil || t > *maxTemp {
			tmp := t
			maxTemp = &tmp
		}
		// Prefer CPU-labeled sensors
		if cpuTemp == nil && isCPUSensor(s.SensorKey) {
			tmp := t
			cpuTemp = &tmp
		}
	}

	if cpuTemp == nil {
		cpuTemp = maxTemp
	}

	return TempMetrics{CPU: cpuTemp, Sys: maxTemp}
}

func isCPUSensor(key string) bool {
	keys := []string{"cpu", "core", "package", "tdie", "tctl", "k10temp", "coretemp"}
	for _, k := range keys {
		for i := 0; i < len(key)-len(k)+1; i++ {
			if key[i:i+len(k)] == k {
				return true
			}
		}
	}
	return false
}

func collectMetrics() (*AgentMetrics, error) {
	hostname, _ := host.Info()
	platform := runtime.GOOS

	uptimeSecs := uint64(0)
	if hostname != nil {
		uptimeSecs = hostname.Uptime
	}

	hostName := ""
	if hostname != nil {
		hostName = hostname.Hostname
	}

	cpuMetrics, loadAvg := collectCPU()

	return &AgentMetrics{
		Platform:  platform,
		Hostname:  hostName,
		Uptime:    uptimeSecs,
		CPU:       cpuMetrics,
		Memory:    collectMemory(),
		Disk:      collectDisk(),
		Network:   collectNetwork(),
		Temps:     collectTemps(),
		LoadAvg:   loadAvg,
		Timestamp: time.Now().UnixMilli(),
	}, nil
}

// --- HTTP handlers ---

func handleMetrics(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
		return
	}

	setCORSHeaders(w, r)

	m, ok := metricsCache.get()
	if !ok {
		var err error
		m, err = collectMetrics()
		if err != nil {
			http.Error(w, `{"error":"failed to collect metrics"}`, http.StatusInternalServerError)
			return
		}
		metricsCache.set(m)
	}

	w.Header().Set("Content-Type", "application/json")
	w.Header().Set("Cache-Control", "no-cache")
	json.NewEncoder(w).Encode(m)
}

func handleHealth(w http.ResponseWriter, r *http.Request) {
	setCORSHeaders(w, r)
	w.Header().Set("Content-Type", "application/json")
	fmt.Fprintf(w, `{"status":"ok","platform":%q}`, runtime.GOOS)
}

func setCORSHeaders(w http.ResponseWriter, r *http.Request) {
	origin := r.Header.Get("Origin")
	// Allow only the dashboard origin — reject wildcard to prevent XSS-based metrics exfiltration
	if origin == "http://localhost:3069" || origin == "http://127.0.0.1:3069" {
		w.Header().Set("Access-Control-Allow-Origin", origin)
		w.Header().Set("Access-Control-Allow-Methods", "GET")
	}
}

// --- Helpers ---

func round1(f float64) float64 {
	return float64(int(f*10+0.5)) / 10
}

func executablePath() (string, error) {
	path, err := os.Executable()
	if err != nil {
		return "", err
	}
	resolved, err := filepath.EvalSymlinks(path)
	if err == nil {
		return resolved, nil
	}
	return path, nil
}

func renderTemplate(name string, values map[string]string) (string, error) {
	raw, err := initTemplates.ReadFile(name)
	if err != nil {
		return "", err
	}

	out := string(raw)
	for key, val := range values {
		out = strings.ReplaceAll(out, "{{"+key+"}}", val)
	}

	return out, nil
}

func ensureDir(path string) error {
	return os.MkdirAll(path, 0o755)
}

func writeFile(path string, content string, mode os.FileMode) error {
	if err := ensureDir(filepath.Dir(path)); err != nil {
		return err
	}
	return os.WriteFile(path, []byte(content), mode)
}

func runCommand(name string, args ...string) error {
	cmd := exec.Command(name, args...)
	cmd.Stdout = os.Stdout
	cmd.Stderr = os.Stderr
	return cmd.Run()
}

func runCommandQuiet(name string, args ...string) error {
	cmd := exec.Command(name, args...)
	return cmd.Run()
}

func agentPortBusy() bool {
	ln, err := stdnet.Listen("tcp", port)
	if err != nil {
		return true
	}
	_ = ln.Close()
	return false
}

func installLaunchd(binaryPath string) error {
	home, err := os.UserHomeDir()
	if err != nil {
		return err
	}

	plistPath := filepath.Join(home, launchAgentRel)
	content, err := renderTemplate("init/launchd.plist.tpl", map[string]string{
		"LABEL":       serviceLabel,
		"BINARY_PATH": binaryPath,
		"WORKING_DIR": filepath.Dir(binaryPath),
		"LOG_PATH":    defaultAgentLog,
	})
	if err != nil {
		return err
	}

	if err := writeFile(plistPath, content, 0o644); err != nil {
		return err
	}

	_ = runCommandQuiet("launchctl", "unload", "-w", plistPath)
	if err := runCommand("launchctl", "load", "-w", plistPath); err != nil {
		return err
	}
	if agentPortBusy() {
		log.Printf("LaunchAgent installed. Port %s already busy, skipping immediate start.", port)
		return nil
	}

	log.Printf("LaunchAgent installed at %s", plistPath)
	return nil
}

func uninstallLaunchd() error {
	home, err := os.UserHomeDir()
	if err != nil {
		return err
	}

	plistPath := filepath.Join(home, launchAgentRel)
	_ = runCommandQuiet("launchctl", "unload", "-w", plistPath)
	if err := os.Remove(plistPath); err != nil && !errors.Is(err, os.ErrNotExist) {
		return err
	}

	log.Printf("LaunchAgent removed from %s", plistPath)
	return nil
}

func installSystemd(binaryPath string) error {
	if os.Geteuid() != 0 {
		return errors.New("systemd install requires root")
	}

	content, err := renderTemplate("init/systemd.service.tpl", map[string]string{
		"BINARY_PATH": binaryPath,
		"WORKING_DIR": filepath.Dir(binaryPath),
		"LOG_PATH":    defaultAgentLog,
	})
	if err != nil {
		return err
	}

	if err := writeFile(systemdServiceRel, content, 0o644); err != nil {
		return err
	}
	if err := runCommand("systemctl", "daemon-reload"); err != nil {
		return err
	}
	if err := runCommand("systemctl", "enable", "homeforge-agent.service"); err != nil {
		return err
	}
	if agentPortBusy() {
		log.Printf("systemd service installed. Port %s already busy, skipping immediate start.", port)
		return nil
	}
	if err := runCommand("systemctl", "start", "homeforge-agent.service"); err != nil {
		return err
	}

	log.Printf("systemd service installed at %s", systemdServiceRel)
	return nil
}

func uninstallSystemd() error {
	if os.Geteuid() != 0 {
		return errors.New("systemd uninstall requires root")
	}

	_ = runCommand("systemctl", "disable", "--now", "homeforge-agent.service")
	if err := os.Remove(systemdServiceRel); err != nil && !errors.Is(err, os.ErrNotExist) {
		return err
	}
	if err := runCommand("systemctl", "daemon-reload"); err != nil {
		return err
	}

	log.Printf("systemd service removed from %s", systemdServiceRel)
	return nil
}

func installWindowsTask(binaryPath string) error {
	taskRun := fmt.Sprintf("\"%s\"", binaryPath)
	return runCommand("schtasks", "/create", "/tn", serviceTaskName, "/tr", taskRun, "/sc", "onstart", "/ru", "SYSTEM", "/rl", "HIGHEST", "/f")
}

func uninstallWindowsTask() error {
	return runCommand("schtasks", "/delete", "/tn", serviceTaskName, "/f")
}

func installService() error {
	binaryPath, err := executablePath()
	if err != nil {
		return err
	}

	switch runtime.GOOS {
	case "darwin":
		return installLaunchd(binaryPath)
	case "linux":
		return installSystemd(binaryPath)
	case "windows":
		return installWindowsTask(binaryPath)
	default:
		return fmt.Errorf("service install unsupported on %s", runtime.GOOS)
	}
}

func uninstallService() error {
	switch runtime.GOOS {
	case "darwin":
		return uninstallLaunchd()
	case "linux":
		return uninstallSystemd()
	case "windows":
		return uninstallWindowsTask()
	default:
		return fmt.Errorf("service uninstall unsupported on %s", runtime.GOOS)
	}
}

// --- Main ---

func main() {
	installFlag := flag.Bool("install-service", false, "Install the host agent as an OS-native service")
	uninstallFlag := flag.Bool("uninstall-service", false, "Remove the OS-native host agent service")
	flag.Parse()

	if *installFlag && *uninstallFlag {
		log.Fatal("use only one of --install-service or --uninstall-service")
	}

	if *installFlag {
		if err := installService(); err != nil {
			log.Fatal(err)
		}
		return
	}

	if *uninstallFlag {
		if err := uninstallService(); err != nil {
			log.Fatal(err)
		}
		return
	}

	http.HandleFunc("/metrics", handleMetrics)
	http.HandleFunc("/health", handleHealth)

	log.Printf("HomeForge Host Agent starting on %s", port)
	log.Printf("Platform: %s | Metrics: http://localhost%s/metrics", runtime.GOOS, port)
	log.Fatal(http.ListenAndServe(port, nil))
}
