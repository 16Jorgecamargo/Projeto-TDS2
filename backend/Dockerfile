FROM node:20-alpine AS builder
WORKDIR /app
COPY package.json package-lock.json ./
COPY backend/package.json ./backend/package.json
RUN npm ci --workspace @marketplace/backend
COPY backend ./backend
RUN npm run build --workspace @marketplace/backend

FROM node:20-alpine AS production
WORKDIR /app
ENV NODE_ENV=production
RUN apk add --no-cache wget
COPY package.json package-lock.json ./
COPY backend/package.json ./backend/package.json
RUN npm ci --workspace @marketplace/backend --omit=dev
COPY --from=builder /app/backend/dist ./backend/dist
EXPOSE 3000
CMD ["node", "backend/dist/server.js"]
