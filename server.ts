import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { Server } from "socket.io";
import http from "http";

async function startServer() {
  const app = express();
  const PORT = 3000;
  const server = http.createServer(app);
  
  // Setup Socket.IO
  const io = new Server(server, {
    cors: {
      origin: "*",
      methods: ["GET", "POST"]
    }
  });

  io.on("connection", (socket) => {
    console.log("Client connected:", socket.id);
    
    socket.on("disconnect", () => {
      console.log("Client disconnected:", socket.id);
    });
    
    // Simulate real-time messaging
    socket.on("send_message", (data) => {
      // Echo back to all clients for MVP
      io.emit("new_message", {
        ...data,
        id: Math.random().toString(36).substr(2, 9),
        timestamp: new Date().toISOString()
      });
    });
  });

  // API Middleware
  app.use(express.json());

  // Proxy endpoint to bypass browser CORS when connecting to WAHA
  app.all("/api/waha-proxy/*", async (req, res) => {
    let wahaUrl = (req.headers["x-waha-url"] || req.query.wahaUrl) as string;
    const authHeader = req.headers["authorization"];
    let apiKeyHeader = (req.headers["x-api-key"] || req.query.apiKey) as string;
    
    if (!wahaUrl) {
      return res.status(400).json({ error: "Missing x-waha-url header" });
    }

    // Extract target path from the request path (remove /api/waha-proxy prefix)
    const targetPath = req.path.replace(/^\/api\/waha-proxy/, "");
    
    // Filter out wahaUrl and apiKey from query params before forwarding
    const query = { ...req.query };
    delete query.wahaUrl;
    delete query.apiKey;
    const searchParams = new URLSearchParams(query as any).toString();
    const queryString = searchParams ? `?${searchParams}` : "";
    const targetUrl = `${wahaUrl.replace(/\/$/, "")}${targetPath}${queryString}`;

    try {
      const headers: HeadersInit = {};
      if (authHeader) {
        headers["Authorization"] = authHeader;
      }
      if (apiKeyHeader) {
        headers["X-Api-Key"] = apiKeyHeader;
      }
      if (req.headers["content-type"]) {
        headers["Content-Type"] = req.headers["content-type"];
      }

      const fetchOptions: RequestInit = {
        method: req.method,
        headers,
      };

      if (["POST", "PUT", "PATCH"].includes(req.method) && req.body && Object.keys(req.body).length > 0) {
        fetchOptions.body = JSON.stringify(req.body);
      }

      const response = await fetch(targetUrl, fetchOptions);
      
      const contentType = response.headers.get("content-type") || "";
      res.status(response.status);
      
      if (contentType.toLowerCase().includes("application/json")) {
        const json = await response.json();
        return res.json(json);
      } else {
        const arrayBuffer = await response.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);
        const finalContentType = (req.query.mimeType as string) || contentType;
        res.setHeader("Content-Type", finalContentType);
        return res.send(buffer);
      }
    } catch (err: any) {
      console.error("WAHA Proxy error:", err);
      return res.status(500).json({ error: "WAHA Proxy failed", details: err.message });
    }
  });

  // Dummy API routes for the architecture 
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok" });
  });

  app.get("/api/conversations", (req, res) => {
    res.json([
      { id: '1', name: 'João Silva', phone: '+5511999999999', lastMessage: 'Gostaria de um orçamento', unread: 2, status: 'Quente' },
      { id: '2', name: 'Maria Souza', phone: '+5511988888888', lastMessage: 'Ok, combinado', unread: 0, status: 'Morno' }
    ]);
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

  server.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
