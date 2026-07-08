# syntax=docker/dockerfile:1

FROM node:20-alpine AS base
WORKDIR /app

FROM base AS deps
COPY package.json package-lock.json ./
RUN npm ci

# Full source + full node_modules. Used directly (via `target: builder` and a
# command override) to run `prisma migrate deploy` and the Blackboard sync worker,
# and as the base for building the app's standalone production output below.
FROM base AS builder
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npx prisma generate
RUN npm run build

# Minimal runtime for the web app: only what Next's standalone output traced as needed.
FROM base AS runner
ENV NODE_ENV=production
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
EXPOSE 3000
CMD ["node", "server.js"]
