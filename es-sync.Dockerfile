# Dockerfile.worker
FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
COPY prisma ./prisma
RUN touch .env .env.dev .env.prod 
COPY .env ./.env
COPY .env.dev ./.env.dev
COPY .env.prod ./.env.prod
COPY prisma.config.ts ./prisma.config.ts

RUN npm ci
RUN npm install -g tsx  
RUN npm install --save-dev @types/pg 
RUN npx prisma generate