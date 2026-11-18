# Multi-stage production build for Node.js Express + WebSocket backend
FROM node:22-alpine AS base

WORKDIR /app

# Install dependencies
COPY package*.json ./
RUN npm ci --omit=dev

# Copy application source code
COPY . .

# Expose HTTP & WebSocket port
EXPOSE 8000

ENV NODE_ENV=production
ENV PORT=8000
ENV HOST=0.0.0.0

# Start server
CMD ["node", "src/index.js"]
