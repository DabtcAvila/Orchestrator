import React, { useState, useEffect } from 'react';
import './App.css';

function QuantumApp() {
    const [data, setData] = useState(null);
    const [metrics, setMetrics] = useState({});
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        fetchData();
        initializeWebSocket();
        setupPerformanceMonitoring();
    }, []);

    const fetchData = async () => {
        try {
            const response = await fetch('http://localhost:3001/api/data');
            const result = await response.json();
            setData(result);
            setIsLoading(false);
        } catch (error) {
            console.error('Error fetching data:', error);
        }
    };

    const initializeWebSocket = () => {
        const ws = new WebSocket('ws://localhost:3001');
        ws.onmessage = (event) => {
            const update = JSON.parse(event.data);
            setMetrics(prev => ({ ...prev, ...update }));
        };
    };

    const setupPerformanceMonitoring = () => {
        const observer = new PerformanceObserver((list) => {
            list.getEntries().forEach((entry) => {
                console.log(`Performance: ${entry.name} - ${entry.duration}ms`);
            });
        });
        observer.observe({ entryTypes: ['measure'] });
    };

    return (
        <div className="quantum-app">
            <header className="app-header">
                <h1>⚡ Quantum Application</h1>
                <p>Powered by Parallel Processing</p>
            </header>
            
            <main className="app-main">
                <div className="dashboard">
                    <div className="metric-card">
                        <h3>Performance</h3>
                        <div className="metric-value">{metrics.performance || '99.9%'}</div>
                    </div>
                    <div className="metric-card">
                        <h3>Throughput</h3>
                        <div className="metric-value">{metrics.throughput || '1000 req/s'}</div>
                    </div>
                    <div className="metric-card">
                        <h3>Latency</h3>
                        <div className="metric-value">{metrics.latency || '12ms'}</div>
                    </div>
                </div>

                {isLoading ? (
                    <div className="loader">Loading quantum state...</div>
                ) : (
                    <div className="content">
                        {data && <pre>{JSON.stringify(data, null, 2)}</pre>}
                    </div>
                )}
            </main>
        </div>
    );
}

export default QuantumApp;