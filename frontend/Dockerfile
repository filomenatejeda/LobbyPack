FROM oven/bun:1

WORKDIR /app-lobbypack/frontend

COPY frontend/package.json frontend/bun.lock ./
RUN bun install

COPY frontend .

EXPOSE 5173

CMD ["bun", "run", "dev:frontend"]
