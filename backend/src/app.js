import "dotenv/config";
import express from "express";
import cors from "cors";
import helmet from "helmet";
import { clerkMiddleware } from "@clerk/express";
import { matchRouter } from "./routes/matches.js";
import { commentaryRouter } from "./routes/commentary.js";
import { authRouter } from "./routes/auth.js";
import { adminRouter } from "./routes/admin.js";
import { webhookRouter } from "./routes/webhooks.js";
import { securityMiddleWare } from "./arcjet.js";
import { pool } from "./db/db.js";

const isProduction = process.env.NODE_ENV === "production";

// Safe development/test Clerk fallback credentials to allow public endpoints and local testing without hard crash
if (!process.env.CLERK_PUBLISHABLE_KEY && (process.env.NODE_ENV === "test" || !isProduction)) {
    process.env.CLERK_PUBLISHABLE_KEY = "pk_test_" + Buffer.from("livsportz.clerk.accounts.dev$").toString("base64");
}
if (!process.env.CLERK_SECRET_KEY && (process.env.NODE_ENV === "test" || !isProduction)) {
    process.env.CLERK_SECRET_KEY = "sk_test_mocksecretkey1234567890abcdef12345678";
}

export const app = express();

// 1. Security Headers (Helmet)
app.use(
    helmet({
        contentSecurityPolicy: false,
        crossOriginEmbedderPolicy: false,
    })
);

// 2. CORS Configuration
const configuredOrigins = (process.env.CLIENT_URL || process.env.CORS_ORIGIN || "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);

const defaultDevOrigins = [
    "http://localhost:3000",
    "http://127.0.0.1:3000",
    "http://localhost:5173",
    "http://127.0.0.1:5173",
];

const allowedOrigins = Array.from(
    new Set([
        ...configuredOrigins,
        ...(!isProduction ? defaultDevOrigins : []),
    ])
);

export const corsOptions = {
    origin: (origin, callback) => {
        // Allow non-browser clients (curl, mobile native apps, server-to-server)
        if (!origin) {
            return callback(null, true);
        }

        if (allowedOrigins.includes(origin)) {
            return callback(null, true);
        }

        return callback(new Error(`Origin ${origin} is not allowed by CORS`));
    },
    methods: ["GET", "POST", "PATCH", "PUT", "DELETE", "OPTIONS"],
    credentials: true,
    optionsSuccessStatus: 204,
};

app.use(cors(corsOptions));

// 3. Body Parser (with rawBody capture for webhook signature verification)
app.use(
    express.json({
        verify: (req, res, buf) => {
            req.rawBody = buf;
        },
    })
);

// 4. Clerk Authentication Middleware
const clerkPublishableKey =
    process.env.CLERK_PUBLISHABLE_KEY ||
    (process.env.NODE_ENV === "test" || !isProduction
        ? "pk_test_" + Buffer.from("livsportz.clerk.accounts.dev$").toString("base64")
        : undefined);

const clerkSecretKey =
    process.env.CLERK_SECRET_KEY ||
    (process.env.NODE_ENV === "test" ? "sk_test_mockclerksecretkey12345" : undefined);

if (clerkPublishableKey) {
    app.use(
        clerkMiddleware({
            publishableKey: clerkPublishableKey,
            secretKey: clerkSecretKey,
        })
    );
}

// 5. Liveness & Readiness Probes (Mounted before Arcjet to prevent rate-limiting orchestrators)
app.get("/healthz", (req, res) => {
    res.status(200).json({
        status: "ok",
        uptime: process.uptime(),
        timestamp: new Date().toISOString(),
    });
});

app.get("/ready", async (req, res) => {
    try {
        await pool.query("SELECT 1");
        res.status(200).json({
            status: "ready",
            database: "connected",
            timestamp: new Date().toISOString(),
        });
    } catch (error) {
        res.status(503).json({
            status: "not_ready",
            database: "disconnected",
            error: "Database connectivity check failed",
        });
    }
});

app.get("/", (req, res) => {
    res.status(200).json({
        name: "LivSportz API",
        status: "online",
        version: "1.0.0",
    });
});

// 6. Arcjet Security Middleware (Rate limiting, bot detection, shield)
app.use(securityMiddleWare());

// 7. Business & Auth Routes
app.use("/webhooks", webhookRouter);
app.use("/auth", authRouter);
app.use("/admin", adminRouter);
app.use("/matches", matchRouter);
app.use("/matches/:id/commentary", commentaryRouter);

// 7. 404 Handler for undefined routes
app.use((req, res) => {
    res.status(404).json({
        error: "Route not found",
        path: req.originalUrl,
    });
});

// 8. Centralized Express Error Handling Middleware
app.use((err, req, res, next) => {
    if (err?.message && err.message.includes("CORS")) {
        return res.status(403).json({
            error: "CORS Forbidden",
            message: err.message,
        });
    }

    const isDev = process.env.NODE_ENV !== "production" && process.env.NODE_ENV !== "test";
    if (isDev) {
        console.error("Express Error:", err);
    }

    const status = Number.isInteger(err.status) && err.status >= 400 ? err.status : 500;

    return res.status(status).json({
        error: status === 500 && !isDev ? "Internal Server Error" : (err.message || "An error occurred"),
        ...(isDev && { stack: err.stack }),
    });
});
