# FROM node:20-alpine AS runner
# WORKDIR /app

# ENV NODE_ENV=production
# ENV PORT=3000
# ENV HOSTNAME=0.0.0.0

# # คัดลอกไฟล์ที่จำเป็นสำหรับ runtime
# COPY --from=builder /app/package.json ./package.json
# COPY --from=builder /app/package-lock.json* ./
# COPY --from=builder /app/node_modules ./node_modules

# COPY --from=builder /app/.next ./.next
# COPY --from=builder /app/public ./public

# EXPOSE 3000

# CMD ["npm", "run", "start"]


# ---- 1. Install Dependencies ----
FROM node:20-alpine AS deps
RUN apk add --no-cache libc6-compat
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm ci

# ---- 2. Build ----
FROM node:20-alpine AS builder
WORKDIR /app
# ดึง node_modules จาก step แรกมา
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build

# ---- 3. Runner ----
FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
# ค่า Default คือ 3000 แต่เราจะ Override ใน docker-compose เป็น 4000
ENV PORT=3000 
ENV HOSTNAME=0.0.0.0

# คัดลอกไฟล์ที่จำเป็น
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/package-lock.json* ./
# Note: การ copy node_modules ทั้งหมดจะใหญ่หน่อย แต่ถ้าไม่ได้ใช้ output: standalone ก็ต้องทำแบบนี้
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public

EXPOSE 3000

CMD ["npm", "run", "start"]