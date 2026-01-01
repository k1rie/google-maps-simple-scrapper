# Usar imagen base de Node.js
FROM node:18-slim

# Instalar dependencias del sistema necesarias para Playwright/Chromium
# Incluir herramientas de compilación por si Playwright las necesita
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
    python3 \
    make \
    g++ \
    && rm -rf /var/lib/apt/lists/*

# Crear directorio de trabajo
WORKDIR /app

# Copiar archivos de dependencias primero (para aprovechar cache de Docker)
COPY package*.json ./

# Instalar dependencias de npm
# npm install es más tolerante que npm ci si hay problemas con package-lock.json
RUN npm install --production

# Crear directorio compartido para navegadores de Playwright
# Esto permite que tanto root como el usuario no-root puedan acceder
RUN mkdir -p /app/.cache/ms-playwright

# Configurar variable de entorno ANTES de instalar navegadores
# Esto hace que Playwright instale en el directorio compartido
ENV PLAYWRIGHT_BROWSERS_PATH=/app/.cache/ms-playwright

# Instalar navegadores de Playwright (Chromium) como root
# Se instalarán en /app/.cache/ms-playwright gracias a la variable de entorno
RUN npx playwright install chromium

# Crear usuario no-root para seguridad
RUN groupadd -r pptruser && useradd -r -g pptruser -G audio,video pptruser \
    && mkdir -p /home/pptruser/Downloads

# Copiar el resto de los archivos de la aplicación
COPY . .

# Ajustar permisos de todos los archivos (incluyendo navegadores de Playwright)
# Los navegadores están en /app/.cache/ms-playwright y deben ser accesibles por pptruser
RUN chown -R pptruser:pptruser /home/pptruser \
    && chown -R pptruser:pptruser /app

# Cambiar a usuario no-root
USER pptruser

# Exponer el puerto
EXPOSE 3000

# Variables de entorno para Playwright (ya configurada arriba, pero la redefinimos)
ENV PLAYWRIGHT_BROWSERS_PATH=/app/.cache/ms-playwright
ENV NODE_ENV=production

# Comando para iniciar la aplicación
CMD ["node", "server.js"]

