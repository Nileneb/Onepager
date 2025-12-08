# Node 20 LTS, klein & sicher
FROM node:20-alpine

# System: curl für Healthcheck optional
RUN apk add --no-cache curl

# Arbeitsverzeichnis
WORKDIR /app

# Nur notwendige Dateien kopieren
COPY package.json package-lock.json* ./

# Nur npm install verwenden
RUN npm install --omit=dev

# App-Dateien
COPY server.js ./server.js
COPY public ./public

# Non-root
RUN addgroup -S app && adduser -S app -G app
USER app

ENV NODE_ENV=production
ENV PORT=3000

EXPOSE 3000

# Healthcheck für Orchestrierung
HEALTHCHECK --interval=30s --timeout=3s --start-period=10s --retries=3 \
    CMD curl -fsS http://localhost:3000/health || exit 1

CMD ["node", "server.js"]
