FROM node:22-alpine AS builder
WORKDIR /usr/src/app

COPY package*.json ./

RUN npm ci --legacy-peer-deps || npm install --legacy-peer-deps
RUN apk update && apk add --no-cache bash
RUN apk add --no-cache \
  chromium \
  nss \
  freetype \
  harfbuzz \
  ttf-freefont \
  ttf-dejavu \
  fontconfig \
  font-noto \
  font-noto-cjk \
  ca-certificates && \
  fc-cache -f -v

# Generate Prisma client inside the container (linux-musl target)
COPY prisma ./prisma
RUN npx prisma generate

# Copy source and build
COPY . .
RUN npm run build

# Prune dev dependencies for runtime image
RUN npm prune --production

# ===== RUNTIME =====
FROM node:22-alpine
WORKDIR /usr/src/app

ENV NODE_ENV=production
ENV PORT=3500

# Install PM2 globally
RUN npm install pm2 -g

# Install system dependencies (postgresql-client and fonts/chromium)
RUN apk update && \
    apk add --no-cache \
      postgresql-client \
      chromium \
      nss \
      freetype \
      harfbuzz \
      ttf-freefont \
      ttf-dejavu \
      fontconfig \
      font-noto \
      font-noto-cjk \
      ca-certificates && \
    fc-cache -f -v || true
# Copy production deps, build output, and prisma schema (with generated client)
COPY . .
COPY --from=builder /usr/src/app/node_modules ./node_modules
COPY --from=builder /usr/src/app/dist ./dist
COPY --from=builder /usr/src/app/prisma ./prisma



EXPOSE 3500

ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium-browser \
    PUPPETEER_SKIP_DOWNLOAD=true
CMD ["sh", "-c", "npm run db:deploy && pm2-runtime dist/src/main.js --name nestjs-app"]
