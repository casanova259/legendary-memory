import "dotenv/config";
import http from "http";
import { app } from "./app.js";
import { attachWebSocketServer } from "./ws/server.js";
import { closeDatabasePool } from "./db/db.js";

const PORT = Number(process.env.PORT || 8000);
const HOST = process.env.HOST || "0.0.0.0";

const server = http.createServer(app);

// Attach WebSocket server
const {
    broadcastMatchCreated,
    broadcastCommentary,
    broadcastMatchUpdated,
    closeWebSocketServer,
    wss,
} = attachWebSocketServer(server);

app.locals.broadcastMatchCreated = broadcastMatchCreated;
app.locals.broadcastCommentary = broadcastCommentary;
app.locals.broadcastMatchUpdated = broadcastMatchUpdated;

// Start HTTP & WebSocket server
server.listen(PORT, HOST, () => {
    const baseUrl =
        HOST === "0.0.0.0" ? `http://localhost:${PORT}` : `http://${HOST}:${PORT}`;

    console.log(`🚀 LivSportz Server is running on ${baseUrl}`);
    console.log(
        `⚡ WebSocket Server is running on ${baseUrl.replace("http", "ws")}/ws`
    );
});

// Graceful Shutdown Handling (SIGINT & SIGTERM)
let isShuttingDown = false;

async function handleShutdown(signal) {
    if (isShuttingDown) return;
    isShuttingDown = true;
    console.log(`\n🛑 Received ${signal}. Starting graceful shutdown...`);

    // Stop accepting new HTTP connections
    server.close(() => {
        console.log("✓ HTTP server stopped listening.");
    });

    try {
        // 1. Close WebSocket connections with code 1001 (Going Away)
        await closeWebSocketServer();
        console.log("✓ WebSocket server closed.");

        // 2. Close PostgreSQL connection pool
        await closeDatabasePool();
        console.log("✓ PostgreSQL connection pool closed.");

        process.exit(0);
    } catch (error) {
        console.error("Error during graceful shutdown:", error);
        process.exit(1);
    }

    // Force exit if cleanup takes longer than 10 seconds
    setTimeout(() => {
        console.error("Graceful shutdown timeout exceeded. Forcing exit.");
        process.exit(1);
    }, 10000).unref();
}

process.on("SIGTERM", () => handleShutdown("SIGTERM"));
process.on("SIGINT", () => handleShutdown("SIGINT"));

export { server, app, wss };
