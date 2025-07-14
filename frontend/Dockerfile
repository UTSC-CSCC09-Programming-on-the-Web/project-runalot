# Build stage
FROM node:18-alpine AS builder
WORKDIR /app
COPY . .
RUN npm install
RUN npm run build

# Production image
FROM node:18-alpine
WORKDIR /app

ARG NEXT_PUBLIC_STRIPE_PUBLIC_KEY
ENV NEXT_PUBLIC_STRIPE_PUBLIC_KEY=$NEXT_PUBLIC_STRIPE_PUBLIC_KEY

ARG GOOGLE_ID
ENV GOOGLE_ID=$GOOGLE_ID

ARG GOOGLE_SECRET
ENV GOOGLE_SECRET=$GOOGLE_SECRET

ARG NEXT_PUBLIC_BACKEND_URL
ENV NEXT_PUBLIC_BACKEND_URL=$NEXT_PUBLIC_BACKEND_URL

ARG NEXT_PUBLIC_PEERHOST
ENV NEXT_PUBLIC_PEERHOST=$NEXT_PUBLIC_PEERHOST


COPY --from=builder /app/public ./public
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./

EXPOSE 3000
CMD ["node", "node_modules/next/dist/bin/next", "start"]