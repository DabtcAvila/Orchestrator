#!/usr/bin/env node

const BaseAgent = require('./base_agent');
const SystemMonitor = require('../monitoring/system_monitor');
const fs = require('fs');
const path = require('path');

class MonitorAgent extends BaseAgent {
  constructor() {
    super('SystemMonitor', 'monitor', [
      'system_monitoring',
      'performance_tracking',
      'alert_generation',
      'resource_monitoring',
      'health_checks'
    ]);
    this.systemMonitor = new SystemMonitor();
    this.alerts = [];
    this.thresholds = {
      memory: 80,
      cpu: 75,
      disk: 90
    };
  }

  async executeTask(task) {
    this.log(`Executing monitoring task: ${task.name}`);
    
    switch (task.command) {
      case 'check_health':
        return await this.checkSystemHealth();
      
      case 'monitor_resources':
        return await this.monitorResources(task.params);
      
      case 'generate_alert':
        return await this.generateAlert(task.params);
      
      case 'collect_metrics':
        return await this.collectMetrics(task.params);
      
      case 'analyze_performance':
        return await this.analyzePerformance(task.params);
      
      default:
        return await this.defaultMonitoring(task);
    }
  }

  async checkSystemHealth() {
    const metrics = this.systemMonitor.collectMetrics();
    const health = this.systemMonitor.getHealthStatus();
    
    const healthReport = {
      status: health,
      timestamp: new Date().toISOString(),
      metrics: {
        memory: {
          usage: metrics.memory.percentUsed + '%',
          free: (metrics.memory.free / 1024 / 1024 / 1024).toFixed(2) + ' GB',
          total: (metrics.memory.total / 1024 / 1024 / 1024).toFixed(2) + ' GB'
        },
        cpu: {
          cores: metrics.cpu.cores,
          loadAverage: metrics.system.loadAverage[0].toFixed(2)
        },
        uptime: {
          system: (metrics.system.uptime / 3600).toFixed(2) + ' hours',
          process: (metrics.process.uptime / 60).toFixed(2) + ' minutes'
        }
      }
    };

    if (health === 'critical' || health === 'warning') {
      await this.generateAlert({
        level: health,
        message: `System health is ${health}`,
        metrics: healthReport.metrics
      });
    }

    this.log(`Health check: ${health}`, health === 'healthy' ? 'info' : 'warning');
    return { success: true, health: healthReport };
  }

  async monitorResources(params) {
    const { duration = 10000, interval = 2000 } = params || {};
    const samples = [];
    const iterations = Math.floor(duration / interval);
    
    this.log(`Starting resource monitoring for ${duration}ms`);
    
    for (let i = 0; i < iterations; i++) {
      const metrics = this.systemMonitor.collectMetrics();
      samples.push({
        timestamp: metrics.timestamp,
        memory: parseFloat(metrics.memory.percentUsed),
        load: metrics.system.loadAverage[0]
      });
      
      await new Promise(resolve => setTimeout(resolve, interval));
    }

    const analysis = {
      duration,
      samples: samples.length,
      memory: {
        avg: (samples.reduce((a, b) => a + b.memory, 0) / samples.length).toFixed(2),
        max: Math.max(...samples.map(s => s.memory)).toFixed(2),
        min: Math.min(...samples.map(s => s.memory)).toFixed(2)
      },
      load: {
        avg: (samples.reduce((a, b) => a + b.load, 0) / samples.length).toFixed(2),
        max: Math.max(...samples.map(s => s.load)).toFixed(2),
        min: Math.min(...samples.map(s => s.load)).toFixed(2)
      }
    };

    this.log(`Resource monitoring complete: ${samples.length} samples collected`);
    return { success: true, analysis, samples };
  }

  async generateAlert(params) {
    const { level = 'info', message, metrics } = params || {};
    
    const alert = {
      id: `alert_${Date.now()}`,
      timestamp: new Date().toISOString(),
      level,
      message,
      metrics,
      agent: this.name
    };

    this.alerts.push(alert);
    
    const alertFile = path.join(__dirname, '..', 'logs', 'alerts.json');
    try {
      let existingAlerts = [];
      if (fs.existsSync(alertFile)) {
        existingAlerts = JSON.parse(fs.readFileSync(alertFile, 'utf8'));
      }
      existingAlerts.push(alert);
      fs.writeFileSync(alertFile, JSON.stringify(existingAlerts, null, 2));
    } catch (error) {
      this.log(`Failed to save alert: ${error.message}`, 'error');
    }

    this.log(`Alert generated: [${level}] ${message}`, level === 'critical' ? 'error' : 'warning');
    
    if (level === 'critical') {
      this.notifyCriticalAlert(alert);
    }
    
    return { success: true, alert };
  }

  async collectMetrics(params) {
    const { count = 5, interval = 1000 } = params || {};
    const metrics = [];
    
    for (let i = 0; i < count; i++) {
      metrics.push(this.systemMonitor.collectMetrics());
      if (i < count - 1) {
        await new Promise(resolve => setTimeout(resolve, interval));
      }
    }
    
    this.log(`Collected ${metrics.length} metric samples`);
    return { success: true, metrics, count: metrics.length };
  }

  async analyzePerformance(params) {
    const { timeframe = 'recent' } = params || {};
    
    const metrics = this.systemMonitor.metrics || [];
    let relevantMetrics = metrics;
    
    if (timeframe === 'recent' && metrics.length > 10) {
      relevantMetrics = metrics.slice(-10);
    }
    
    const analysis = {
      timeframe,
      samples: relevantMetrics.length,
      performance: {
        memoryTrend: this.calculateTrend(relevantMetrics, 'memory'),
        cpuTrend: this.calculateTrend(relevantMetrics, 'cpu'),
        health: this.systemMonitor.getHealthStatus()
      },
      recommendations: []
    };

    if (analysis.performance.memoryTrend === 'increasing') {
      analysis.recommendations.push('Consider investigating memory usage - increasing trend detected');
    }
    
    if (analysis.performance.health !== 'healthy') {
      analysis.recommendations.push(`System health is ${analysis.performance.health} - immediate attention may be required`);
    }

    this.log(`Performance analysis complete: ${analysis.recommendations.length} recommendations`);
    return { success: true, analysis };
  }

  calculateTrend(metrics, type) {
    if (metrics.length < 2) return 'insufficient_data';
    
    let values = [];
    if (type === 'memory') {
      values = metrics.map(m => parseFloat(m.memory?.percentUsed || 0));
    } else if (type === 'cpu') {
      values = metrics.map(m => m.system?.loadAverage?.[0] || 0);
    }
    
    const firstHalf = values.slice(0, Math.floor(values.length / 2));
    const secondHalf = values.slice(Math.floor(values.length / 2));
    
    const firstAvg = firstHalf.reduce((a, b) => a + b, 0) / firstHalf.length;
    const secondAvg = secondHalf.reduce((a, b) => a + b, 0) / secondHalf.length;
    
    if (secondAvg > firstAvg * 1.1) return 'increasing';
    if (secondAvg < firstAvg * 0.9) return 'decreasing';
    return 'stable';
  }

  notifyCriticalAlert(alert) {
    this.log(`CRITICAL ALERT: ${alert.message}`, 'error');
    console.log('\n🚨 CRITICAL SYSTEM ALERT 🚨');
    console.log(`Message: ${alert.message}`);
    console.log(`Time: ${alert.timestamp}`);
    if (alert.metrics) {
      console.log('Metrics:', JSON.stringify(alert.metrics, null, 2));
    }
  }

  async defaultMonitoring(task) {
    this.log(`Executing default monitoring: ${task.name}`);
    const metrics = this.systemMonitor.collectMetrics();
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    return { 
      success: true, 
      task: task.name,
      currentMetrics: {
        memory: metrics.memory.percentUsed + '%',
        load: metrics.system.loadAverage[0].toFixed(2),
        uptime: (metrics.system.uptime / 3600).toFixed(2) + ' hours'
      }
    };
  }
}

if (require.main === module) {
  const agent = new MonitorAgent();
  agent.initialize();
  
  console.log('\nMonitor Agent is running. Monitoring system health...');
  console.log('Commands: status, health, alerts, shutdown\n');

  setInterval(() => {
    agent.checkSystemHealth().catch(err => {
      agent.log(`Health check error: ${err.message}`, 'error');
    });
  }, 30000);

  process.stdin.on('data', (data) => {
    const command = data.toString().trim().toLowerCase();
    
    if (command === 'status') {
      console.log(JSON.stringify(agent.getStatus(), null, 2));
    } else if (command === 'health') {
      agent.checkSystemHealth().then(result => {
        console.log(JSON.stringify(result.health, null, 2));
      });
    } else if (command === 'alerts') {
      console.log(`Total alerts: ${agent.alerts.length}`);
      agent.alerts.slice(-5).forEach(alert => {
        console.log(`[${alert.level}] ${alert.timestamp}: ${alert.message}`);
      });
    } else if (command === 'shutdown') {
      agent.shutdown();
    }
  });

  process.on('SIGINT', () => agent.shutdown());
  process.on('SIGTERM', () => agent.shutdown());
}

module.exports = MonitorAgent;