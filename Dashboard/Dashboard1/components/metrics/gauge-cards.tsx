"use client"

import { Cpu, HardDrive, Gauge, Thermometer } from "lucide-react"

interface CircularGaugeProps {
  value: number
  maxValue?: number
  color: string
  size?: number
  strokeWidth?: number
}

function CircularGauge({ value, maxValue = 100, color, size = 64, strokeWidth = 6 }: CircularGaugeProps) {
  const radius = (size - strokeWidth) / 2
  const circumference = radius * 2 * Math.PI
  const offset = circumference - (value / maxValue) * circumference * 0.75
  
  return (
    <svg width={size} height={size} className="transform -rotate-[135deg]">
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        stroke="currentColor"
        strokeWidth={strokeWidth}
        strokeDasharray={`${circumference * 0.75} ${circumference}`}
        className="opacity-10 text-foreground"
      />
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeDasharray={`${circumference * 0.75} ${circumference}`}
        strokeDashoffset={offset}
        strokeLinecap="round"
        className="transition-all duration-1000 ease-in-out"
      />
    </svg>
  )
}

interface GaugeCardProps {
  icon: React.ReactNode
  title: string
  value: number
  unit: string
  color: string
  subtitle?: string
  subtitleValue?: string | number
}

function GaugeCard({ icon, title, value, unit, color, subtitle, subtitleValue }: GaugeCardProps) {
  return (
    <div className="bg-card rounded-xl border border-border p-3 flex flex-col h-full shadow-sm overflow-hidden">
      <div className="flex items-center gap-2 shrink-0">
        <div className="text-primary">{icon}</div>
        <span className="text-[10px] font-black uppercase tracking-widest opacity-40 text-foreground">{title}</span>
      </div>
      
      <div className="flex-1 min-h-0 flex items-center justify-center overflow-hidden">
        <div className="relative shrink-0">
          <CircularGauge value={value} color={color} size={56} strokeWidth={5} />
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-center translate-y-0.5">
              <span className="text-sm font-bold tabular-nums" style={{ color }}>{value.toFixed(1)}</span>
              <span className="text-[8px] font-black opacity-30 text-foreground ml-0.5">{unit}</span>
            </div>
          </div>
        </div>
      </div>
      
      {subtitle && (
        <div className="flex justify-between text-[9px] pt-1 border-t border-border mt-auto shrink-0">
          <span className="opacity-40 uppercase font-bold text-foreground">{subtitle}</span>
          <span className="font-bold text-foreground">{subtitleValue}</span>
        </div>
      )}
    </div>
  )
}

export function CpuGauge({ value, containerCount }: { value: number, containerCount: number }) {
  return (
    <GaugeCard
      icon={<Cpu className="w-3.5 h-3.5" />}
      title="Processing"
      value={value}
      unit="%"
      color="#22d3ee"
      subtitle="Nodes"
      subtitleValue={`${containerCount} active`}
    />
  )
}

export function MemoryGauge({ value, usedBytes }: { value: number, usedBytes: string }) {
  return (
    <GaugeCard
      icon={<HardDrive className="w-3.5 h-3.5" />}
      title="Memory"
      value={value}
      unit="%"
      color="#facc15"
      subtitle="Usage"
      subtitleValue={`${usedBytes} GB`}
    />
  )
}

export function GpuGauge({ gpu }: { gpu: { load: number; temp: number } | null }) {
  if (!gpu) {
    return (
      <div className="bg-card rounded-xl border border-border p-3 flex flex-col h-full shadow-sm overflow-hidden opacity-50">
        <div className="flex items-center gap-2 shrink-0">
          <Gauge className="w-3.5 h-3.5 text-[#a855f7]" />
          <span className="text-[10px] font-black uppercase tracking-widest opacity-40 text-foreground">GPU Load</span>
        </div>
        <div className="flex-1 flex items-center justify-center">
          <span className="text-xs font-black opacity-30 text-foreground">No GPU</span>
        </div>
      </div>
    )
  }

  return (
    <GaugeCard
      icon={<Gauge className="w-3.5 h-3.5" />}
      title="GPU Load"
      value={gpu.load}
      unit="%"
      color="#a855f7"
      subtitle="Device"
      subtitleValue="Active"
    />
  )
}

export function TemperatureGauge({ temps }: { temps: { cpu: number | null; gpu: number | null; sys: number | null } }) {
  const displayTemps = [
    { label: "CPU", value: temps.cpu, color: "#22d3ee" },
    { label: "GPU", value: temps.gpu, color: "#a855f7" },
    { label: "SYS", value: temps.sys, color: "#22c55e" },
  ].filter(t => t.value !== null)

  if (displayTemps.length === 0) {
    return (
      <div className="bg-card rounded-xl border border-border p-3 h-full flex flex-col shadow-sm overflow-hidden">
        <div className="flex items-center gap-2 shrink-0">
          <Thermometer className="w-3.5 h-3.5 text-orange-400" />
          <span className="text-[10px] font-black uppercase tracking-widest opacity-40 text-foreground">Thermals</span>
        </div>
        <div className="flex-1 flex items-center justify-center">
          <span className="text-xs font-black opacity-30 text-foreground">N/A</span>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-card rounded-xl border border-border p-3 h-full flex flex-col shadow-sm overflow-hidden">
      <div className="flex items-center gap-2 shrink-0">
        <Thermometer className="w-3.5 h-3.5 text-orange-400" />
        <span className="text-[10px] font-black uppercase tracking-widest opacity-40 text-foreground">Thermals</span>
      </div>

      <div className="flex-1 min-h-0 flex items-center justify-around overflow-hidden">
        {displayTemps.map((temp) => (
          <div key={temp.label} className="text-center flex flex-col items-center">
            <div className="relative">
              <CircularGauge value={Math.min(temp.value!, 100)} maxValue={100} color={temp.color} size={36} strokeWidth={3} />
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-[9px] font-bold translate-y-0.5" style={{ color: temp.color }}>
                  {temp.value}°
                </span>
              </div>
            </div>
            <span className="text-[8px] font-black opacity-30 mt-1 uppercase">{temp.label}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
