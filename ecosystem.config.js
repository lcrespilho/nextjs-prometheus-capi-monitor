module.exports = {
  apps: [
    {
      name: 'nextjs-prometheus-capi-monitor',
      script: 'npm',
      args: 'start',
      env: {
        NODE_ENV: 'production',
        PORT: 1033
      },
      // Restart on crash
      autorestart: true,
      // Watch for changes (optional, usually false for prod)
      watch: false,
      // Memory limit before restart
      max_memory_restart: '1G'
    }
  ]
}
