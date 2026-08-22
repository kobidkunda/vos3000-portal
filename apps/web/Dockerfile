FROM node:24-alpine AS base
WORKDIR /app
COPY package*.json ./
COPY apps/api/package.json apps/api/package.json
COPY apps/web/package.json apps/web/package.json
COPY apps/worker/package.json apps/worker/package.json
COPY packages/shared/package.json packages/shared/package.json
COPY packages/vos-adapter/package.json packages/vos-adapter/package.json
RUN npm install
COPY . .
RUN npm run build -w @vos/shared && npm run build -w @vos/web
EXPOSE 3000
CMD ["npm","run","start","-w","@vos/web"]
