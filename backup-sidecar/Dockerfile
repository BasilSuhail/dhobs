FROM node:20-alpine

# Install build dependencies for better-sqlite3 and docker/tar client
RUN apk add --no-cache \
    python3 \
    make \
    g++ \
    docker-cli \
    tar \
    sqlite \
    mysql-client \
    postgresql-client

WORKDIR /app

COPY package*.json ./
# Build from source using the system python/g++ to get sqlcipher
RUN npm install

COPY tsconfig.json ./
COPY src ./src
RUN npm run build

CMD ["npm", "start"]