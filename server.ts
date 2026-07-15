import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { spawn, ChildProcess } from "child_process";

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Process state
  let currentProcess: ChildProcess | null = null;
  let logBuffer: string[] = [];
  let startTime: number | null = null;
  let runCount = 0;

  // Helper to add log entries
  function appendLog(source: "node" | "python" | "error", text: string) {
    const timestamp = new Date().toLocaleTimeString();
    const prefix = source === "node" 
      ? `[${timestamp}] \x1b[34m[node]\x1b[0m` 
      : source === "error" 
        ? `[${timestamp}] \x1b[31m[error]\x1b[0m` 
        : `[${timestamp}] \x1b[32m[python]\x1b[0m`;

    const lines = text.split("\n");
    for (const line of lines) {
      if (line.trim()) {
        logBuffer.push(`${prefix} ${line.trim()}`);
      }
    }

    // Keep log buffer under 200 lines to prevent memory bloat
    if (logBuffer.length > 200) {
      logBuffer = logBuffer.slice(logBuffer.length - 200);
    }
  }

  // Spawn function
  function spawnPythonWorker() {
    if (currentProcess) {
      try {
        currentProcess.kill();
        appendLog("node", "Terminated existing Python worker process.");
      } catch (e) {
        appendLog("error", `Failed to kill existing process: ${e}`);
      }
    }

    appendLog("node", "Spawning new Python background process...");
    
    // Spawn script.py in background
    currentProcess = spawn("python3", ["script.py"]);
    startTime = Date.now();
    runCount++;

    const pid = currentProcess.pid;
    appendLog("node", `Python background process spawned successfully with PID: ${pid}`);

    // Handle stdout
    currentProcess.stdout?.on("data", (data) => {
      appendLog("python", data.toString());
    });

    // Handle stderr
    currentProcess.stderr?.on("data", (data) => {
      appendLog("error", data.toString());
    });

    // Handle exit
    currentProcess.on("close", (code) => {
      appendLog("node", `Python background process exited with code: ${code}`);
      currentProcess = null;
    });

    currentProcess.on("error", (err) => {
      appendLog("error", `Child process encountered error: ${err.message}`);
    });
  }

  // Start initial background script on server boot
  spawnPythonWorker();

  // API Endpoints
  app.get("/api/status", (req, res) => {
    res.json({
      active: currentProcess !== null,
      pid: currentProcess ? currentProcess.pid : null,
      uptimeSeconds: startTime && currentProcess ? Math.floor((Date.now() - startTime) / 1000) : 0,
      runCount,
      logCount: logBuffer.length,
      nodeVersion: process.version,
    });
  });

  app.get("/api/logs", (req, res) => {
    res.json({ logs: logBuffer });
  });

  app.post("/api/restart", (req, res) => {
    appendLog("node", "User requested manual background process restart.");
    spawnPythonWorker();
    res.json({ status: "success", message: "Background process restarted." });
  });

  app.post("/api/kill", (req, res) => {
    if (currentProcess) {
      appendLog("node", "User requested manual background process termination.");
      currentProcess.kill();
      res.json({ status: "success", message: "Background process terminated." });
    } else {
      res.status(400).json({ status: "error", message: "No active process to terminate." });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
