import { useState, useEffect, useRef } from 'react';
import { 
  Terminal, 
  Cpu, 
  Activity, 
  Play, 
  Square, 
  RefreshCw, 
  CheckCircle, 
  AlertTriangle, 
  Server, 
  Database,
  Layers,
  Clock
} from 'lucide-react';

interface SystemStatus {
  active: boolean;
  pid: number | null;
  uptimeSeconds: number;
  runCount: number;
  logCount: number;
  nodeVersion: string;
}

export default function App() {
  const [logs, setLogs] = useState<string[]>([]);
  const [status, setStatus] = useState<SystemStatus>({
    active: false,
    pid: null,
    uptimeSeconds: 0,
    runCount: 0,
    logCount: 0,
    nodeVersion: 'Loading...',
  });
  const [autoScroll, setAutoScroll] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [cpuLoad, setCpuLoad] = useState<number[]>(Array(10).fill(10));
  
  const terminalEndRef = useRef<HTMLDivElement>(null);

  // Poll logs and status
  useEffect(() => {
    const fetchData = async () => {
      try {
        const [statusRes, logsRes] = await Promise.all([
          fetch('/api/status'),
          fetch('/api/logs')
        ]);
        
        if (statusRes.ok) {
          const statusData = await statusRes.json();
          setStatus(statusData);
        }
        
        if (logsRes.ok) {
          const logsData = await logsRes.json();
          setLogs(logsData.logs || []);
        }
      } catch (err) {
        console.error("Error polling system data", err);
      }
    };

    // Run immediately and then poll
    fetchData();
    const interval = setInterval(fetchData, 1000);
    return () => clearInterval(interval);
  }, []);

  // Update CPU Load graph continuously to represent activity
  useEffect(() => {
    const cpuInterval = setInterval(() => {
      if (status.active) {
        setCpuLoad(prev => {
          const next = [...prev.slice(1)];
          next.push(Math.floor(Math.random() * 35) + 15); // Active variation
          return next;
        });
      } else {
        setCpuLoad(prev => {
          const next = [...prev.slice(1)];
          next.push(Math.floor(Math.random() * 3) + 1); // Quiet variation
          return next;
        });
      }
    }, 1500);

    return () => clearInterval(cpuInterval);
  }, [status.active]);

  // Auto scroll terminal
  useEffect(() => {
    if (autoScroll && terminalEndRef.current) {
      terminalEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [logs, autoScroll]);

  const handleRestart = async () => {
    setActionLoading(true);
    try {
      await fetch('/api/restart', { method: 'POST' });
    } catch (err) {
      console.error(err);
    } finally {
      setActionLoading(false);
    }
  };

  const handleKill = async () => {
    setActionLoading(true);
    try {
      await fetch('/api/kill', { method: 'POST' });
    } catch (err) {
      console.error(err);
    } finally {
      setActionLoading(false);
    }
  };

  const formatUptime = (totalSeconds: number) => {
    const hrs = Math.floor(totalSeconds / 3600);
    const mins = Math.floor((totalSeconds % 3600) / 60);
    const secs = totalSeconds % 60;
    return `${hrs}h ${mins}m ${secs}s`;
  };

  // ANSI/Log Coloring Helper
  const renderLogLine = (line: string, index: number) => {
    let textColor = "text-zinc-300";
    let isWarning = false;
    let isError = false;

    // Detect tags & apply coloring
    if (line.includes("[node]")) {
      textColor = "text-blue-400";
    } else if (line.includes("[error]")) {
      textColor = "text-red-400";
      isError = true;
    } else if (line.includes("[python]")) {
      textColor = "text-emerald-400";
    }

    if (line.includes("[WARNING]") || line.includes("WARNING")) {
      textColor = "text-yellow-400 font-semibold";
      isWarning = true;
    }

    return (
      <div key={index} className={`font-mono text-xs py-0.5 leading-relaxed flex items-start gap-2 ${textColor}`}>
        <span className="text-zinc-600 select-none">{(index + 1).toString().padStart(3, '0')}</span>
        <span className="flex-1 whitespace-pre-wrap">
          {line.replace(/\\x1b\[\d+m/g, '')} {/* Strip terminal escape sequences if any */}
        </span>
        {isWarning && <span className="bg-yellow-950/40 text-yellow-500 text-[9px] px-1 rounded uppercase font-semibold">warn</span>}
        {isError && <span className="bg-red-950/40 text-red-500 text-[9px] px-1 rounded uppercase font-semibold">err</span>}
      </div>
    );
  };

  const currentCpu = cpuLoad[cpuLoad.length - 1];

  return (
    <div className="min-h-screen bg-[#0A0A0C] text-[#E4E4E7] p-4 md:p-8 flex flex-col gap-6 font-sans antialiased select-none">
      
      {/* Header Section */}
      <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-zinc-900 pb-5">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-emerald-500 rounded-xl flex items-center justify-center font-bold text-black shadow-lg shadow-emerald-500/10">JS</div>
          <div className="h-6 w-px bg-zinc-800"></div>
          <div className="w-10 h-10 bg-[#3776AB] rounded-xl flex items-center justify-center font-bold text-white shadow-lg shadow-blue-500/10">PY</div>
          <div className="ml-2">
            <h1 className="text-lg font-semibold tracking-tight text-white flex items-center gap-2">
              NodeBridge Controller
              <span className="px-2 py-0.5 text-[10px] bg-zinc-900 border border-zinc-800 rounded-md font-mono text-zinc-500">v1.2.0</span>
            </h1>
            <p className="text-xs text-zinc-500 font-mono">Cluster Active / node_version: {status.nodeVersion}</p>
          </div>
        </div>
        
        <div className="flex items-center gap-4 bg-zinc-950 border border-zinc-900 px-4 py-2 rounded-full shadow-inner">
          <div className="flex items-center gap-2">
            <div className={`w-2.5 h-2.5 rounded-full ${status.active ? 'bg-emerald-500 animate-pulse' : 'bg-red-500'}`}></div>
            <span className={`text-xs font-semibold uppercase tracking-wider ${status.active ? 'text-emerald-400' : 'text-red-400'}`}>
              {status.active ? 'System Active' : 'System Terminated'}
            </span>
          </div>
          <div className="w-px h-3 bg-zinc-800"></div>
          <span className="text-xs text-zinc-400 font-mono flex items-center gap-1">
            <Clock className="w-3.5 h-3.5 text-zinc-500" />
            Uptime: {status.active ? formatUptime(status.uptimeSeconds) : '0h 0m 0s'}
          </span>
        </div>
      </header>

      {/* Main Bento Grid */}
      <main className="flex-1 grid grid-cols-1 md:grid-cols-12 gap-4">
        
        {/* Main Process Monitor Terminal */}
        <section className="col-span-1 md:col-span-8 bg-[#111113] border border-zinc-900 rounded-2xl p-5 flex flex-col h-[520px] shadow-lg">
          <div className="flex justify-between items-center mb-4">
            <div className="flex items-center gap-2">
              <Terminal className="w-4 h-4 text-emerald-400" />
              <h2 className="text-xs font-semibold uppercase tracking-wider text-zinc-400">Real-time Bridge Stream</h2>
            </div>
            <div className="flex gap-2 items-center">
              <label className="flex items-center gap-2 text-[11px] text-zinc-500 mr-2 cursor-pointer hover:text-zinc-400">
                <input 
                  type="checkbox" 
                  checked={autoScroll} 
                  onChange={(e) => setAutoScroll(e.target.checked)} 
                  className="rounded border-zinc-800 bg-zinc-900 text-emerald-500 focus:ring-0 focus:ring-offset-0 w-3.5 h-3.5"
                />
                Auto-scroll
              </label>
              <button 
                onClick={() => setLogs([])}
                className="px-2 py-1 bg-zinc-900 border border-zinc-800/80 hover:border-zinc-700 rounded text-[10px] font-mono text-zinc-400 transition-colors"
              >
                Clear Screen
              </button>
            </div>
          </div>
          
          <div className="flex-1 bg-black/45 rounded-xl p-4 font-mono text-xs leading-relaxed overflow-y-auto border border-white/[0.02] shadow-inner custom-scrollbar">
            {logs.length === 0 ? (
              <div className="h-full flex items-center justify-center text-zinc-600 font-mono text-xs gap-2">
                <Activity className="w-4 h-4 animate-pulse text-zinc-700" />
                Listening for incoming pipeline stdout...
              </div>
            ) : (
              logs.map((line, index) => renderLogLine(line, index))
            )}
            <div ref={terminalEndRef} />
          </div>
        </section>

        {/* Sidebar Widgets Column */}
        <div className="col-span-1 md:col-span-4 flex flex-col gap-4">
          
          {/* Active Process / Daemon Info */}
          <section className="bg-[#111113] border border-zinc-900 rounded-2xl p-5 shadow-lg flex-1 flex flex-col justify-between">
            <div>
              <div className="flex items-center gap-2 mb-4">
                <Database className="w-4 h-4 text-[#3776AB]" />
                <h2 className="text-xs font-semibold uppercase tracking-wider text-zinc-400">Active Worker Scripts</h2>
              </div>
              
              <div className="space-y-3">
                <div className="p-3.5 rounded-xl bg-white/[0.02] border border-white/[0.04] flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`w-2 h-2 rounded-full ${status.active ? 'bg-emerald-500 animate-pulse' : 'bg-red-500'}`}></div>
                    <div>
                      <span className="text-xs font-semibold text-white block">script.py</span>
                      <span className="text-[10px] text-zinc-500 font-mono">Loop intervals: 3000ms</span>
                    </div>
                  </div>
                  <div className="text-right font-mono text-xs text-zinc-400">
                    {status.active ? (
                      <span className="text-emerald-400 bg-emerald-950/25 px-2 py-0.5 rounded border border-emerald-900/30">PID: {status.pid}</span>
                    ) : (
                      <span className="text-red-400 bg-red-950/25 px-2 py-0.5 rounded border border-red-900/30">Stopped</span>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 mt-4">
                  <div className="bg-white/[0.01] border border-white/[0.03] rounded-xl p-3 text-center">
                    <span className="text-[10px] text-zinc-500 uppercase font-mono block">Worker Runs</span>
                    <span className="text-xl font-bold font-mono text-zinc-200 mt-1 block">{status.runCount}</span>
                  </div>
                  <div className="bg-white/[0.01] border border-white/[0.03] rounded-xl p-3 text-center">
                    <span className="text-[10px] text-zinc-500 uppercase font-mono block">Parsed Logs</span>
                    <span className="text-xl font-bold font-mono text-zinc-200 mt-1 block">{status.logCount}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Bridge Controls */}
            <div className="mt-5 border-t border-zinc-900/80 pt-4">
              <h3 className="text-[11px] font-semibold uppercase tracking-wider text-zinc-500 mb-3">Bridge Pipeline Controls</h3>
              <div className="grid grid-cols-2 gap-3">
                <button 
                  onClick={handleRestart}
                  disabled={actionLoading}
                  className="flex items-center justify-center gap-2 py-2.5 rounded-xl bg-zinc-900 border border-zinc-800 hover:border-zinc-700 hover:bg-zinc-850 text-xs font-semibold text-zinc-200 transition-colors disabled:opacity-50"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${actionLoading ? 'animate-spin' : ''}`} />
                  RESTART PY
                </button>
                <button 
                  onClick={handleKill}
                  disabled={actionLoading || !status.active}
                  className="flex items-center justify-center gap-2 py-2.5 rounded-xl bg-red-950/20 border border-red-900/30 text-red-400 hover:bg-red-900/10 transition-colors disabled:opacity-30 disabled:pointer-events-none text-xs font-semibold"
                >
                  <Square className="w-3.5 h-3.5 fill-current" />
                  KILL PYTHON
                </button>
              </div>
            </div>
          </section>

          {/* System Resources */}
          <section className="bg-[#111113] border border-zinc-900 rounded-2xl p-5 shadow-lg">
            <div className="flex items-center gap-2 mb-4">
              <Layers className="w-4 h-4 text-emerald-500" />
              <h2 className="text-xs font-semibold uppercase tracking-wider text-zinc-400">Memory Distribution</h2>
            </div>
            
            <div className="space-y-4">
              <div>
                <div className="flex justify-between text-[11px] mb-1.5 font-mono">
                  <span className="text-zinc-500">Node.js Memory</span>
                  <span className="text-emerald-400">142.4 MB</span>
                </div>
                <div className="h-1.5 w-full bg-zinc-900 border border-zinc-850 rounded-full overflow-hidden">
                  <div className="h-full bg-emerald-500 rounded-full w-[28%] transition-all duration-1000"></div>
                </div>
              </div>

              <div>
                <div className="flex justify-between text-[11px] mb-1.5 font-mono">
                  <span className="text-zinc-500">Python Sandbox Memory</span>
                  <span className="text-blue-400">{status.active ? '348.1 MB' : '0.0 MB'}</span>
                </div>
                <div className="h-1.5 w-full bg-zinc-900 border border-zinc-850 rounded-full overflow-hidden">
                  <div className={`h-full bg-blue-500 rounded-full transition-all duration-1000 ${status.active ? 'w-[45%]' : 'w-0'}`}></div>
                </div>
              </div>
            </div>
          </section>

          {/* CPU Load Metric Visualizer */}
          <section className="bg-[#111113] border border-zinc-900 rounded-2xl p-5 shadow-lg">
            <div className="flex justify-between items-center mb-4">
              <div className="flex items-center gap-2">
                <Cpu className="w-4 h-4 text-emerald-400" />
                <h2 className="text-xs font-semibold uppercase tracking-wider text-zinc-400">CPU Load</h2>
              </div>
              <span className="text-[10px] font-mono text-zinc-500">60s Window</span>
            </div>

            <div className="flex items-end gap-1 h-14 bg-black/20 rounded-lg p-2 border border-zinc-900/60">
              {cpuLoad.map((load, index) => (
                <div 
                  key={index} 
                  style={{ height: `${load}%` }}
                  className={`flex-1 rounded-sm transition-all duration-300 ${
                    status.active 
                      ? load > 40 
                        ? 'bg-yellow-500/80' 
                        : 'bg-emerald-500/80' 
                      : 'bg-zinc-800'
                  }`}
                />
              ))}
            </div>

            <div className="flex justify-between mt-3 text-[10px] font-mono text-zinc-500 uppercase tracking-wider">
              <span>Idle State</span>
              <span className="text-emerald-400">Current: {status.active ? `${currentCpu}%` : '1%'}</span>
            </div>
          </section>

        </div>

      </main>

      {/* Footer Status Bar */}
      <footer className="flex flex-col md:flex-row justify-between items-start md:items-center px-2 py-3 border-t border-zinc-900 text-[10px] font-mono text-zinc-500 gap-2">
        <div className="flex flex-wrap gap-4 md:gap-6">
          <span className="flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-blue-500"></span>
            NODE_ENV: production
          </span>
          <span className="flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
            PYTHON_PATH: /usr/bin/python3
          </span>
          <span className="flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-purple-500"></span>
            IPC_MODE: spawn_pipes
          </span>
        </div>
        <div className="flex gap-4">
          <span>Logs Refreshed: Real-time</span>
          <span className="text-emerald-700 font-semibold tracking-wider">SECURE LINK ESTABLISHED</span>
        </div>
      </footer>

    </div>
  );
}
