FROM node:20-alpine

WORKDIR /app

# Copiem tot monorepo-ul (avem nevoie de shared package)
COPY package*.json ./
COPY packages/shared/package*.json ./packages/shared/
COPY apps/server/package*.json ./apps/server/

RUN npm install

# Build shared
COPY packages/shared/ ./packages/shared/
RUN npm run build --workspace=packages/shared

# Build server
COPY apps/server/ ./apps/server/
RUN npm run build --workspace=apps/server

EXPOSE 3001

CMD ["node", "apps/server/dist/index.js"]
