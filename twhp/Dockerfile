FROM node:20-alpine AS deps

RUN apk add --no-cache libc6-compat zlib libcrypto3 libssl3 && \
    rm -rf /usr/bin/untgz

WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

# ---- 2. Build ----
FROM node:20-alpine AS builder

RUN apk add --no-cache zlib libcrypto3 libssl3 && \
    rm -rf /usr/bin/untgz

WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build

# ---- 3. Runner ----
FROM node:20-alpine AS runner

RUN apk add --no-cache zlib libcrypto3 libssl3 && \
    rm -rf /usr/bin/untgz

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/package-lock.json ./package-lock.json
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public

EXPOSE 3000

CMD ["npm", "run", "start"]