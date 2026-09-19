# syntax=docker/dockerfile:1

FROM node:22-alpine AS base
WORKDIR /app
# argon2 ships prebuilds for musl, but node-gyp needs these if it ever falls back.
RUN apk add --no-cache python3 make g++ libc6-compat


FROM base AS deps
COPY package.json package-lock.json ./
RUN npm ci


FROM base AS development
ENV NODE_ENV=development
COPY --from=deps /app/node_modules ./node_modules
COPY . .
EXPOSE 3001
CMD ["npm", "run", "start:dev"]


FROM base AS build
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build
# Drop dev dependencies from the tree we are about to copy into the runtime.
RUN npm prune --omit=dev


FROM node:22-alpine AS production
WORKDIR /app
ENV NODE_ENV=production

RUN apk add --no-cache libc6-compat tini curl \
    && addgroup -g 1001 -S nodejs \
    && adduser -u 1001 -S nestjs -G nodejs

# Amazon's RDS CA chain is not in Node's default trust store, so verifying the
# database certificate needs the bundle on disk. Without it the only options
# are an unverified connection or none at all.
RUN mkdir -p /app/certs \
    && curl -fsSL https://truststore.pki.rds.amazonaws.com/global/global-bundle.pem \
       -o /app/certs/rds-global-bundle.pem \
    && apk del curl

COPY --from=build --chown=nestjs:nodejs /app/node_modules ./node_modules
COPY --from=build --chown=nestjs:nodejs /app/dist ./dist
COPY --from=build --chown=nestjs:nodejs /app/package.json ./package.json

RUN chown -R nestjs:nodejs /app/certs

USER nestjs
EXPOSE 3001

# tini reaps zombies and forwards SIGTERM, so ECS task draining works.
ENTRYPOINT ["/sbin/tini", "--"]

HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD node -e "require('http').get('http://127.0.0.1:3001/health/live',r=>process.exit(r.statusCode===200?0:1)).on('error',()=>process.exit(1))"

CMD ["node", "dist/main.js"]
