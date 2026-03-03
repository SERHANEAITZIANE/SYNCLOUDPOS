module.exports = {
    apps: [
        {
            name: "syncloudpos",
            script: "node_modules/.bin/next",
            args: "start",
            cwd: "/var/www/syncloudpos",
            instances: 1,
            exec_mode: "fork",
            watch: false,
            max_memory_restart: "512M",
            env: {
                NODE_ENV: "production",
                PORT: 3000
            },
            // Auto-restart on crash with exponential backoff
            restart_delay: 3000,
            max_restarts: 10,
            min_uptime: "10s",
            // Health monitoring
            listen_timeout: 10000,
            kill_timeout: 5000,
            // Logs
            log_date_format: "YYYY-MM-DD HH:mm:ss",
            error_file: "/var/log/pm2/syncloudpos-error.log",
            out_file: "/var/log/pm2/syncloudpos-out.log",
            merge_logs: true,
        }
    ]
}
