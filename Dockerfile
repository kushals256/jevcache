FROM node:20-bookworm-slim AS build
RUN apt-get update && apt-get install -y python3 make g++ && rm -rf /var/lib/apt/lists/*
WORKDIR /app
# Copy sources before npm install so `prepare` → `tsc` can see tsconfig + src
COPY package.json package-lock.json* tsconfig.json ./
COPY src ./src
COPY .env.example ./
RUN npm install
RUN npm run build && npm prune --omit=dev

FROM node:20-bookworm-slim
RUN apt-get update && apt-get install -y libstdc++6 && rm -rf /var/lib/apt/lists/*
WORKDIR /app
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist
COPY --from=build /app/package.json ./
COPY --from=build /app/.env.example ./
ENV DATA_DIR=/data HOST=0.0.0.0 PORT=8080
VOLUME ["/data"]
EXPOSE 8080
CMD ["node", "dist/cli.js"]
