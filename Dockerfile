FROM node:24-bookworm-slim AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --no-audit --no-fund
COPY . .
ARG VITE_AI_ENABLED=true
ARG VITE_TURNS=5
ENV VITE_AI_ENABLED=$VITE_AI_ENABLED VITE_TURNS=$VITE_TURNS
RUN npm run build

FROM node:24-bookworm-slim AS runtime
ENV NODE_ENV=production PORT=8080
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --omit=dev --no-audit --no-fund && npm cache clean --force
COPY --from=build --chown=node:node /app/dist ./dist
COPY --from=build --chown=node:node /app/server ./server
COPY --from=build --chown=node:node /app/src/engine ./src/engine
USER node
EXPOSE 8080
CMD ["node", "server/index.ts"]
