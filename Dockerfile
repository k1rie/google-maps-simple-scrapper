# Usar imagen base de Node.js
FROM node:18-slim

# Instalar dependencias del sistema necesarias para Puppeteer/Chromium
RUN apt-get update && apt-get install -y \
    wget \
    gnupg \
    ca-certificates \
    fonts-liberation \
    libasound2 \
    libatk-bridge2.0-0 \
    libatk1.0-0 \
    libc6 \
    libcairo2 \
    libcups2 \
    libdbus-1-3 \
    libexpat1 \
    libfontconfig1 \
    libgbm1 \
    libgcc1 \
    libglib2.0-0 \
    libgtk-3-0 \
    libnspr4 \
    libnss3 \
    libpango-1.0-0 \
    libpangocairo-1.0-0 \
    libstdc++6 \
    libx11-6 \
    libx11-xcb1 \
    libxcb1 \
    libxcomposite1 \
    libxcursor1 \
    libxdamage1 \
    libxext6 \
    libxfixes3 \
    libxi6 \
    libxrandr2 \
    libxrender1 \
    libxss1 \
    libxtst6 \
    lsb-release \
    xdg-utils \
    && rm -rf /var/lib/apt/lists/*

# Crear directorio de trabajo
WORKDIR /app

# Configurar variable de entorno para Puppeteer ANTES de instalar
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=false
ENV PUPPETEER_CACHE_DIR=/app/.cache/puppeteer

# Copiar archivos de dependencias primero (para aprovechar cache de Docker)
COPY package*.json ./

# Instalar dependencias de npm
RUN npm ci --only=production

# Crear directorio de cache y descargar Chromium explícitamente
RUN mkdir -p /app/.cache/puppeteer && \
    npx puppeteer browsers install chrome

# Crear usuario no-root para seguridad
RUN groupadd -r pptruser && useradd -r -g pptruser -G audio,video pptruser \
    && mkdir -p /home/pptruser/Downloads \
    && mkdir -p /home/pptruser/.cache/puppeteer

# Copiar el resto de los archivos de la aplicación
COPY . .

# Ajustar permisos de todos los archivos (incluyendo cache de Puppeteer)
RUN chown -R pptruser:pptruser /home/pptruser \
    && chown -R pptruser:pptruser /app

# Cambiar a usuario no-root
USER pptruser

# Exponer el puerto
EXPOSE 3000

# Variables de entorno para Puppeteer (ya configuradas arriba, pero las redefinimos para claridad)
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=false
ENV PUPPETEER_CACHE_DIR=/app/.cache/puppeteer
ENV NODE_ENV=production

# Comando para iniciar la aplicación
CMD ["node", "server.js"]

