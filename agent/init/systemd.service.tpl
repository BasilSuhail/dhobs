[Unit]
Description=HomeForge Host Agent
After=network-online.target
Wants=network-online.target

[Service]
Type=simple
ExecStart={{BINARY_PATH}}
WorkingDirectory={{WORKING_DIR}}
Restart=always
RestartSec=2
StandardOutput=append:{{LOG_PATH}}
StandardError=append:{{LOG_PATH}}

[Install]
WantedBy=multi-user.target
