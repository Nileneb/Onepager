# Node 20 LTS, klein & sicher
FROM node:20-alpine

# System: curl für Healthcheck, sqlite-dev und su-exec für Permissions
RUN apk add --no-cache curl python3 make g++ sqlite-dev su-exec

# Arbeitsverzeichnis
WORKDIR /app

# Nur notwendige Dateien kopieren
COPY package.json package-lock.json* ./

# Nur npm install verwenden
RUN npm install --omit=dev

# App-Dateien
COPY server.js ./server.js
COPY public ./public
COPY static ./static
COPY docker-entrypoint.sh ./docker-entrypoint.sh

# Create data dir and ensure app user owns it
RUN mkdir -p /app/data && chown -R node:node /app/data
RUN chmod +x /app/docker-entrypoint.sh

# Runtime as root but entrypoint will switch to node using su-exec
USER root

ENV NODE_ENV=production
ENV PORT=3000

EXPOSE 3000

# Healthcheck für Orchestrierung
HEALTHCHECK --interval=30s --timeout=3s --start-period=10s --retries=3 \
    CMD curl -fsS http://localhost:3000/health || exit 1

ENTRYPOINT ["/app/docker-entrypoint.sh"]
CMD ["node", "server.js"]
