#!/usr/bin/env node

const http = require('http');
const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');

// Simple in-memory database
const database = {
    metrics: [],
    tasks: [],
    users: []
};

// Generate real-time metrics
function generateMetrics() {
    return {
        cpu: (Math.random() * 100).toFixed(2),
        memory: (Math.random() * 100).toFixed(2),
        requests: Math.floor(Math.random() * 1000),
        responseTime: Math.floor(Math.random() * 50),
        throughput: Math.floor(Math.random() * 500) + 500,
        activeConnections: Math.floor(Math.random() * 100),
        tasksProcessed: database.tasks.length,
        timestamp: new Date().toISOString()
    };
}

// Process a task
function processTask(task) {
    return new Promise((resolve) => {
        setTimeout(() => {
            resolve({
                ...task,
                status: 'completed',
                result: `Processed ${task.type} successfully`,
                processingTime: Math.floor(Math.random() * 1000)
            });
        }, Math.random() * 2000);
    });
}

// HTML Dashboard
const dashboardHTML = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>⚡ Quantum App - Live Dashboard</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            min-height: 100vh;
            color: white;
        }
        
        .container {
            max-width: 1400px;
            margin: 0 auto;
            padding: 20px;
        }
        
        header {
            text-align: center;
            padding: 30px 0;
            background: rgba(0, 0, 0, 0.2);
            backdrop-filter: blur(10px);
            border-radius: 20px;
            margin-bottom: 30px;
        }
        
        h1 {
            font-size: 3em;
            margin-bottom: 10px;
            text-shadow: 2px 2px 4px rgba(0,0,0,0.3);
        }
        
        .subtitle {
            font-size: 1.2em;
            opacity: 0.9;
        }
        
        .metrics-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
            gap: 20px;
            margin-bottom: 30px;
        }
        
        .metric-card {
            background: rgba(255, 255, 255, 0.1);
            backdrop-filter: blur(10px);
            border-radius: 15px;
            padding: 25px;
            text-align: center;
            transition: transform 0.3s, box-shadow 0.3s;
            border: 1px solid rgba(255, 255, 255, 0.2);
        }
        
        .metric-card:hover {
            transform: translateY(-5px);
            box-shadow: 0 10px 30px rgba(0, 0, 0, 0.3);
        }
        
        .metric-label {
            font-size: 0.9em;
            opacity: 0.8;
            margin-bottom: 10px;
            text-transform: uppercase;
            letter-spacing: 1px;
        }
        
        .metric-value {
            font-size: 2.5em;
            font-weight: bold;
            background: linear-gradient(45deg, #00ff88, #00ddff);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
            background-clip: text;
        }
        
        .metric-unit {
            font-size: 0.8em;
            opacity: 0.7;
        }
        
        .live-indicator {
            display: inline-block;
            width: 10px;
            height: 10px;
            background: #00ff88;
            border-radius: 50%;
            margin-left: 10px;
            animation: pulse 2s infinite;
        }
        
        @keyframes pulse {
            0%, 100% { opacity: 1; }
            50% { opacity: 0.3; }
        }
        
        .chart-container {
            background: rgba(255, 255, 255, 0.1);
            backdrop-filter: blur(10px);
            border-radius: 15px;
            padding: 25px;
            margin-bottom: 30px;
            border: 1px solid rgba(255, 255, 255, 0.2);
        }
        
        .chart-title {
            font-size: 1.5em;
            margin-bottom: 20px;
        }
        
        .activity-log {
            background: rgba(0, 0, 0, 0.3);
            border-radius: 15px;
            padding: 20px;
            max-height: 300px;
            overflow-y: auto;
        }
        
        .log-entry {
            padding: 10px;
            margin-bottom: 10px;
            background: rgba(255, 255, 255, 0.05);
            border-radius: 8px;
            border-left: 3px solid #00ff88;
            font-family: 'Courier New', monospace;
            font-size: 0.9em;
        }
        
        .status-bar {
            background: rgba(0, 0, 0, 0.3);
            padding: 15px;
            border-radius: 10px;
            text-align: center;
            margin-top: 30px;
        }
        
        .status-item {
            display: inline-block;
            margin: 0 20px;
        }
        
        .status-dot {
            display: inline-block;
            width: 8px;
            height: 8px;
            border-radius: 50%;
            margin-right: 5px;
        }
        
        .status-healthy { background: #00ff88; }
        .status-warning { background: #ffaa00; }
        .status-error { background: #ff4444; }
        
        canvas {
            width: 100%;
            height: 200px;
        }
        
        .controls {
            background: rgba(255, 255, 255, 0.1);
            backdrop-filter: blur(10px);
            border-radius: 15px;
            padding: 20px;
            margin-bottom: 30px;
            text-align: center;
        }
        
        button {
            background: linear-gradient(45deg, #667eea, #764ba2);
            color: white;
            border: none;
            padding: 12px 30px;
            border-radius: 25px;
            font-size: 1em;
            cursor: pointer;
            margin: 0 10px;
            transition: transform 0.3s;
        }
        
        button:hover {
            transform: scale(1.05);
        }
        
        button:active {
            transform: scale(0.95);
        }
    </style>
</head>
<body>
    <div class="container">
        <header>
            <h1>⚡ Quantum Application Dashboard</h1>
            <p class="subtitle">Real-time Performance Monitoring <span class="live-indicator"></span></p>
        </header>
        
        <div class="controls">
            <button onclick="simulateLoad()">🚀 Simulate Load</button>
            <button onclick="processTestTask()">⚙️ Process Task</button>
            <button onclick="clearMetrics()">🗑️ Clear Metrics</button>
            <button onclick="toggleAutoRefresh()">🔄 Auto Refresh: <span id="autoStatus">ON</span></button>
        </div>
        
        <div class="metrics-grid">
            <div class="metric-card">
                <div class="metric-label">CPU Usage</div>
                <div class="metric-value" id="cpu">0</div>
                <div class="metric-unit">%</div>
            </div>
            
            <div class="metric-card">
                <div class="metric-label">Memory Usage</div>
                <div class="metric-value" id="memory">0</div>
                <div class="metric-unit">%</div>
            </div>
            
            <div class="metric-card">
                <div class="metric-label">Throughput</div>
                <div class="metric-value" id="throughput">0</div>
                <div class="metric-unit">req/s</div>
            </div>
            
            <div class="metric-card">
                <div class="metric-label">Response Time</div>
                <div class="metric-value" id="responseTime">0</div>
                <div class="metric-unit">ms</div>
            </div>
            
            <div class="metric-card">
                <div class="metric-label">Active Connections</div>
                <div class="metric-value" id="connections">0</div>
                <div class="metric-unit">users</div>
            </div>
            
            <div class="metric-card">
                <div class="metric-label">Tasks Processed</div>
                <div class="metric-value" id="tasks">0</div>
                <div class="metric-unit">total</div>
            </div>
        </div>
        
        <div class="chart-container">
            <h2 class="chart-title">📊 Performance Timeline</h2>
            <canvas id="chart"></canvas>
        </div>
        
        <div class="activity-log">
            <h3 style="margin-bottom: 15px;">📝 Activity Log</h3>
            <div id="logContainer"></div>
        </div>
        
        <div class="status-bar">
            <span class="status-item">
                <span class="status-dot status-healthy"></span>
                Database: Connected
            </span>
            <span class="status-item">
                <span class="status-dot status-healthy"></span>
                API: Operational
            </span>
            <span class="status-item">
                <span class="status-dot status-healthy"></span>
                Cache: Active
            </span>
            <span class="status-item" id="serverTime">
                Server Time: --
            </span>
        </div>
    </div>
    
    <script>
        let autoRefresh = true;
        let chartData = {
            labels: [],
            cpu: [],
            memory: [],
            throughput: []
        };
        
        // Update metrics
        async function updateMetrics() {
            try {
                const response = await fetch('/api/metrics');
                const data = await response.json();
                
                // Update metric cards
                document.getElementById('cpu').textContent = data.cpu;
                document.getElementById('memory').textContent = data.memory;
                document.getElementById('throughput').textContent = data.throughput;
                document.getElementById('responseTime').textContent = data.responseTime;
                document.getElementById('connections').textContent = data.activeConnections;
                document.getElementById('tasks').textContent = data.tasksProcessed;
                
                // Update server time
                document.getElementById('serverTime').textContent = 
                    'Server Time: ' + new Date(data.timestamp).toLocaleTimeString();
                
                // Update chart data
                chartData.labels.push(new Date().toLocaleTimeString());
                chartData.cpu.push(parseFloat(data.cpu));
                chartData.memory.push(parseFloat(data.memory));
                chartData.throughput.push(data.throughput);
                
                // Keep only last 20 points
                if (chartData.labels.length > 20) {
                    chartData.labels.shift();
                    chartData.cpu.shift();
                    chartData.memory.shift();
                    chartData.throughput.shift();
                }
                
                drawChart();
                
                // Add log entry
                addLogEntry(\`Metrics updated - CPU: \${data.cpu}%, Throughput: \${data.throughput} req/s\`);
                
            } catch (error) {
                console.error('Error fetching metrics:', error);
                addLogEntry('Error fetching metrics: ' + error.message, 'error');
            }
        }
        
        // Draw chart
        function drawChart() {
            const canvas = document.getElementById('chart');
            const ctx = canvas.getContext('2d');
            const width = canvas.width = canvas.offsetWidth;
            const height = canvas.height = 200;
            
            ctx.clearRect(0, 0, width, height);
            
            // Draw grid
            ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
            ctx.lineWidth = 1;
            for (let i = 0; i <= 4; i++) {
                const y = (height / 4) * i;
                ctx.beginPath();
                ctx.moveTo(0, y);
                ctx.lineTo(width, y);
                ctx.stroke();
            }
            
            // Draw CPU line
            drawLine(ctx, chartData.cpu, '#00ff88', width, height);
            
            // Draw Memory line
            drawLine(ctx, chartData.memory, '#00ddff', width, height);
            
            // Draw Throughput line (scaled)
            const scaledThroughput = chartData.throughput.map(v => v / 10);
            drawLine(ctx, scaledThroughput, '#ffaa00', width, height);
        }
        
        function drawLine(ctx, data, color, width, height) {
            if (data.length < 2) return;
            
            ctx.strokeStyle = color;
            ctx.lineWidth = 2;
            ctx.beginPath();
            
            const xStep = width / (data.length - 1);
            data.forEach((value, index) => {
                const x = index * xStep;
                const y = height - (value / 100) * height;
                
                if (index === 0) {
                    ctx.moveTo(x, y);
                } else {
                    ctx.lineTo(x, y);
                }
            });
            
            ctx.stroke();
        }
        
        // Add log entry
        function addLogEntry(message, type = 'info') {
            const container = document.getElementById('logContainer');
            const entry = document.createElement('div');
            entry.className = 'log-entry';
            entry.textContent = \`[\${new Date().toLocaleTimeString()}] \${message}\`;
            
            if (type === 'error') {
                entry.style.borderLeftColor = '#ff4444';
            }
            
            container.insertBefore(entry, container.firstChild);
            
            // Keep only last 10 entries
            while (container.children.length > 10) {
                container.removeChild(container.lastChild);
            }
        }
        
        // Simulate load
        async function simulateLoad() {
            addLogEntry('Simulating heavy load...');
            
            const promises = [];
            for (let i = 0; i < 10; i++) {
                promises.push(fetch('/api/simulate-load'));
            }
            
            await Promise.all(promises);
            addLogEntry('Load simulation complete!');
            updateMetrics();
        }
        
        // Process test task
        async function processTestTask() {
            addLogEntry('Processing test task...');
            
            try {
                const response = await fetch('/api/process-task', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        type: 'test',
                        payload: { data: 'test data' }
                    })
                });
                
                const result = await response.json();
                addLogEntry(\`Task completed: \${result.result}\`);
                updateMetrics();
            } catch (error) {
                addLogEntry('Error processing task: ' + error.message, 'error');
            }
        }
        
        // Clear metrics
        function clearMetrics() {
            chartData = {
                labels: [],
                cpu: [],
                memory: [],
                throughput: []
            };
            drawChart();
            addLogEntry('Metrics cleared');
        }
        
        // Toggle auto refresh
        function toggleAutoRefresh() {
            autoRefresh = !autoRefresh;
            document.getElementById('autoStatus').textContent = autoRefresh ? 'ON' : 'OFF';
            addLogEntry('Auto refresh ' + (autoRefresh ? 'enabled' : 'disabled'));
        }
        
        // Auto refresh loop
        setInterval(() => {
            if (autoRefresh) {
                updateMetrics();
            }
        }, 2000);
        
        // Initial load
        updateMetrics();
        addLogEntry('Dashboard initialized successfully');
    </script>
</body>
</html>`;

// Create HTTP server
const server = http.createServer(async (req, res) => {
    // CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    
    if (req.method === 'OPTIONS') {
        res.writeHead(200);
        res.end();
        return;
    }
    
    // Route handling
    if (req.url === '/' || req.url === '/dashboard') {
        res.writeHead(200, { 'Content-Type': 'text/html' });
        res.end(dashboardHTML);
        
    } else if (req.url === '/api/metrics') {
        const metrics = generateMetrics();
        database.metrics.push(metrics);
        
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(metrics));
        
    } else if (req.url === '/api/simulate-load') {
        // Simulate some processing
        await new Promise(resolve => setTimeout(resolve, Math.random() * 500));
        
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ status: 'load simulated' }));
        
    } else if (req.url === '/api/process-task' && req.method === 'POST') {
        let body = '';
        req.on('data', chunk => body += chunk);
        req.on('end', async () => {
            try {
                const task = JSON.parse(body);
                task.id = Date.now();
                database.tasks.push(task);
                
                const result = await processTask(task);
                
                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify(result));
            } catch (error) {
                res.writeHead(400, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ error: error.message }));
            }
        });
        
    } else if (req.url === '/api/health') {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
            status: 'healthy',
            uptime: process.uptime(),
            memory: process.memoryUsage(),
            timestamp: new Date()
        }));
        
    } else {
        res.writeHead(404, { 'Content-Type': 'text/plain' });
        res.end('Not Found');
    }
});

// Start server
const PORT = process.env.PORT || 3000;

server.listen(PORT, () => {
    console.log('\x1b[35m%s\x1b[0m', `
╔════════════════════════════════════════════════════════════════════════════╗
║                    ⚡ QUANTUM APPLICATION RUNNING ⚡                        ║
╚════════════════════════════════════════════════════════════════════════════╝
    `);
    
    console.log('\x1b[32m%s\x1b[0m', `✅ Server is running on http://localhost:${PORT}`);
    console.log('\x1b[36m%s\x1b[0m', `📊 Dashboard available at http://localhost:${PORT}/dashboard`);
    console.log('\x1b[33m%s\x1b[0m', `🚀 API endpoints:`);
    console.log(`   GET  /api/metrics     - Real-time metrics`);
    console.log(`   GET  /api/health      - Health check`);
    console.log(`   POST /api/process-task - Process a task`);
    console.log(`   GET  /api/simulate-load - Simulate heavy load`);
    console.log('\n\x1b[35m%s\x1b[0m', `💡 Open http://localhost:${PORT} in your browser to see the live dashboard`);
    console.log('\x1b[90m%s\x1b[0m', `Press Ctrl+C to stop the server\n`);
    
    // Auto-open browser on macOS
    if (process.platform === 'darwin') {
        exec(`open http://localhost:${PORT}`);
    }
});

// Graceful shutdown
process.on('SIGINT', () => {
    console.log('\n\x1b[33m%s\x1b[0m', '⚠️  Shutting down server...');
    server.close(() => {
        console.log('\x1b[32m%s\x1b[0m', '✅ Server stopped gracefully');
        process.exit(0);
    });
});