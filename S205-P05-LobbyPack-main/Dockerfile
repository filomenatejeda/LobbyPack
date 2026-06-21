FROM oven/bun:1

WORKDIR /app-lobbypack

COPY package.json bun.lock ./
RUN bun install

COPY . .

EXPOSE 5173

CMD ["bun", "run", "dev:frontend"]
