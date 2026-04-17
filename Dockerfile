FROM node:20-slim

RUN apt-get update && apt-get install -y \
    chromium \
    fonts-liberation \
    libnss3 \
    libatk-bridge2.0-0 \
    libgtk-3-0 \
    libx11-xcb1 \
    libxcomposite1 \
    libxdamage1 \
    libxrandr2 \
    libasound2 \
    libpangocairo-1.0-0 \
    libpango-1.0-0 \
    libgbm1 \
    ca-certificates \
    && rm -rf /var/lib/apt/lists/*

ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true
ENV CHROME_PATH=/usr/bin/chromium
ENV PORT=3000
ENV NODE_ENV=production

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies (including devDependencies for build)
# Use npm ci for reproducible builds (requires package-lock.json)
RUN npm ci --include=dev || npm install

# Copy project files
COPY . .

# Accept build arguments for Next.js public environment variables
ARG NEXT_PUBLIC_API_URL
ARG NEXT_PUBLIC_SESSION_TIMEOUT_MS

# Set build-time environment variables for Next.js
ENV NEXT_PUBLIC_API_URL=${NEXT_PUBLIC_API_URL}
ENV NEXT_PUBLIC_SESSION_TIMEOUT_MS=${NEXT_PUBLIC_SESSION_TIMEOUT_MS}

# Build the application
RUN npm run build

EXPOSE 3000

# create a non-root user and set permissions
RUN adduser --disabled-password --gecos "" nodeuser && chown -R nodeuser:nodeuser /app

# switch to the non-root user
USER nodeuser

# Start app first; run DB check after server is ready (waits for port 3000, then tests DB)
CMD ["sh", "-c", "node scripts/check-db.js & exec npm start"]

