# Build stage
FROM node:18-alpine AS builder
WORKDIR /app
COPY . .
RUN npm install
RUN npm run build

# Production image
FROM node:18-alpine
WORKDIR /app
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./

EXPOSE 3000
CMD ["node", "node_modules/next/dist/bin/next", "start"]


# FROM node:18-alpine AS build
# WORKDIR /app
# ENV PATH /app/node_modules/.bin:$PATH
# COPY package.json ./
# COPY package-lock.json ./
# RUN npm ci --silent
# COPY . ./
# # Modify your next.config.js to include "output: 'standalone'"
# RUN npm run build

# FROM node:18-alpine
# WORKDIR /app
# COPY --from=build /app/public ./public
# COPY --from=build /app/.next/standalone ./
# COPY --from=build /app/.next/static ./.next/static

# ENV NODE_ENV=production
# ENV PORT=80

# EXPOSE 80
# CMD ["node", "server.js"]