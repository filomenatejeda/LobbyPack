FROM oven/bun

WORKDIR /app-lobbypack

COPY . .

RUN bun install

EXPOSE 5173

CMD ["bun", "run", "dev"]