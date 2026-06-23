FROM oven/bun:1

WORKDIR /app

COPY package.json bun.lock ./
RUN bun install

COPY . .

EXPOSE 3000

CMD ["bun", "run", "start"]
# WORKDIR /app-lobbypack/backend

# COPY backend/package.json ./package.json
# RUN bun install

# COPY backend .

# EXPOSE 3000

# CMD ["bun", "run", "dev"]
