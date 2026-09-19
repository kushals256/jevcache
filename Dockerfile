FROM node:22-bookworm-slim AS build
WORKDIR /app
COPY package.json package-lock.json* tsconfig.json ./
COPY src ./src
COPY bin ./bin
COPY .env.example ./
RUN npm install
RUN npm run build && npm prune --omit=dev

FROM node:22-bookworm-slim
WORKDIR /app
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist
COPY --from=build /app/bin ./bin
COPY --from=build /app/package.json ./
COPY --from=build /app/.env.example ./
ENV DATA_DIR=/data HOST=0.0.0.0 PORT=8080 NODE_OPTIONS=--experimental-sqlite
VOLUME ["/data"]
EXPOSE 8080
CMD ["node", "--experimental-sqlite", "dist/cli.js"]
