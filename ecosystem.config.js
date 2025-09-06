module.exports = {
  apps: [
    {
      name: 'orchestrator',
      script: './agents/orchestrator_controller.js',
      instances: 1,
      exec_mode: 'fork',
      autorestart: true,
      watch: false,
      max_memory_restart: '1G',
      env: {
        NODE_ENV: 'production',
        MODEL: 'claude-opus-4-1-20250805'
      },
      error_file: './logs/orchestrator-error.log',
      out_file: './logs/orchestrator-out.log',
      log_file: './logs/orchestrator-combined.log',
      time: true,
      cron_restart: '0 3 * * *', // Restart daily at 3 AM
      min_uptime: '10s',
      max_restarts: 10
    },
    {
      name: 'data-processor',
      script: './agents/data_processor.js',
      instances: 1,
      exec_mode: 'fork',
      autorestart: true,
      watch: false,
      max_memory_restart: '512M',
      env: {
        NODE_ENV: 'production',
        MODEL: 'claude-sonnet-4-20241022'
      },
      error_file: './logs/data-processor-error.log',
      out_file: './logs/data-processor-out.log',
      log_file: './logs/data-processor-combined.log',
      time: true,
      min_uptime: '10s',
      max_restarts: 10
    },
    {
      name: 'file-manager',
      script: './agents/file_manager.js',
      instances: 1,
      exec_mode: 'fork',
      autorestart: true,
      watch: false,
      max_memory_restart: '512M',
      env: {
        NODE_ENV: 'production',
        MODEL: 'claude-sonnet-4-20241022'
      },
      error_file: './logs/file-manager-error.log',
      out_file: './logs/file-manager-out.log',
      log_file: './logs/file-manager-combined.log',
      time: true,
      min_uptime: '10s',
      max_restarts: 10
    },
    {
      name: 'monitor',
      script: './agents/monitor_agent.js',
      instances: 1,
      exec_mode: 'fork',
      autorestart: true,
      watch: false,
      max_memory_restart: '512M',
      env: {
        NODE_ENV: 'production',
        MODEL: 'claude-sonnet-4-20241022'
      },
      error_file: './logs/monitor-error.log',
      out_file: './logs/monitor-out.log',
      log_file: './logs/monitor-combined.log',
      time: true,
      min_uptime: '10s',
      max_restarts: 10,
      cron_restart: '0 */6 * * *' // Restart every 6 hours
    },
    {
      name: 'research',
      script: './agents/research_agent.js',
      instances: 1,
      exec_mode: 'fork',
      autorestart: true,
      watch: false,
      max_memory_restart: '1G',
      env: {
        NODE_ENV: 'production',
        MODEL: 'claude-sonnet-4-20241022'
      },
      error_file: './logs/research-error.log',
      out_file: './logs/research-out.log',
      log_file: './logs/research-combined.log',
      time: true,
      min_uptime: '10s',
      max_restarts: 10
    }
  ],

  deploy: {
    production: {
      user: 'node',
      host: 'localhost',
      ref: 'origin/main',
      repo: 'GIT_REPOSITORY',
      path: '/Users/davicho/MASTER proyectos/Orchestrator',
      'pre-deploy-local': '',
      'post-deploy': 'npm install && pm2 reload ecosystem.config.js --env production',
      'pre-setup': ''
    }
  }
};