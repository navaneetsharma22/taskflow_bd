module.exports = {
  apps: [
    {
      name: 'taskflow-backend',
      script: 'src/server.js',
      instances: 'max', // Auto cluster CPU cores dynamically
      exec_mode: 'cluster', // Cluster mode
      watch: false,
      max_memory_restart: '1G',
      env_production: {
        NODE_ENV: 'production',
        PORT: 5000,
      },
      error_file: 'src/logs/pm2-error.log',
      out_file: 'src/logs/pm2-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      combine_logs: true,
      merge_logs: true,
    },
  ],
};
