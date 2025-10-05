FROM node:22-alpine

# Create app directory
WORKDIR /app

# Install ffmpeg, yt-dlp and build dependencies
RUN apk add --no-cache \
    ffmpeg \
    python3 \
    py3-pip \
    make \
    g++ && \
    python3 -m pip install --no-cache-dir --break-system-packages yt-dlp

# Copy dependency files
COPY package*.json ./

# Install dependencies (safe way)
# Using npm install instead of npm ci to avoid lockfile mismatch errors
RUN npm install --omit=dev && \
    npm cache clean --force

# Bundle app source
COPY . ./

# Create download directory for audio files with proper permissions
RUN mkdir -p /tmp/audio && chmod 755 /tmp/audio

# Expose port
EXPOSE 5000

# Health check
HEALTHCHECK --interval=30s --timeout=5s --start-period=60s --retries=3 \
  CMD node -e "require('http').get('http://localhost:5000', (r) => r.statusCode === 200 ? process.exit(0) : process.exit(1))"

# Run as non-root user
USER node

# Set production environment
ENV NODE_ENV=production

# Start the bot
CMD ["npm", "run", "start"]
