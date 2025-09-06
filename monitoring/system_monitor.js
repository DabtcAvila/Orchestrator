const os = require('os');
const fs = require('fs');
const path = require('path');

class SystemMonitor {
  constructor() {
    this.metricsFile = path.join(__dirname, 'metrics.json');
    this.metrics = [];
  }

  collectMetrics() {
    const metrics = {
      timestamp: new Date().toISOString(),
      system: {
        platform: os.platform(),
        arch: os.arch(),
        hostname: os.hostname(),
        uptime: os.uptime(),
        loadAverage: os.loadavg()
      },
      memory: {
        total: os.totalmem(),
        free: os.freemem(),
        used: os.totalmem() - os.freemem(),
        percentUsed: ((os.totalmem() - os.freemem()) / os.totalmem() * 100).toFixed(2)
      },
      cpu: {
        cores: os.cpus().length,
        model: os.cpus()[0].model,
        speed: os.cpus()[0].speed
      },
      process: {
        pid: process.pid,
        memory: process.memoryUsage(),
        uptime: process.uptime()
      }
    };

    this.metrics.push(metrics);
    this.saveMetrics();
    return metrics;
  }

  saveMetrics() {
    try {
      fs.writeFileSync(this.metricsFile, JSON.stringify(this.metrics, null, 2));
    } catch (error) {
      console.error('Failed to save metrics:', error.message);
    }
  }

  getLatestMetrics() {
    if (this.metrics.length > 0) {
      return this.metrics[this.metrics.length - 1];
    }
    return null;
  }

  getHealthStatus() {
    const latest = this.getLatestMetrics();
    if (!latest) return 'unknown';

    const memoryUsed = parseFloat(latest.memory.percentUsed);
    const loadAvg = latest.system.loadAverage[0];
    const cpuCores = latest.cpu.cores;

    if (memoryUsed > 90 || loadAvg > cpuCores * 0.8) {
      return 'critical';
    } else if (memoryUsed > 70 || loadAvg > cpuCores * 0.6) {
      return 'warning';
    } else {
      return 'healthy';
    }
  }

  startMonitoring(intervalMs = 60000) {
    console.log(`Starting system monitoring (interval: ${intervalMs}ms)`);
    this.collectMetrics();
    
    setInterval(() => {
      const metrics = this.collectMetrics();
      const health = this.getHealthStatus();
      console.log(`[MONITOR] System health: ${health} | Memory: ${metrics.memory.percentUsed}% | Load: ${metrics.system.loadAverage[0].toFixed(2)}`);
    }, intervalMs);
  }
}

module.exports = SystemMonitor;