FROM node:20-alpine AS build

WORKDIR /usr/src/app
COPY package*.json ./
RUN npm ci

COPY tsconfig.json ./
COPY src ./src
COPY prisma ./prisma
COPY openapi ./openapi
RUN npm run build

FROM node:20-alpine

WORKDIR /usr/src/app
ENV NODE_ENV=production

COPY package*.json ./
RUN npm ci

COPY --from=build /usr/src/app/dist ./dist
COPY --from=build /usr/src/app/prisma ./prisma
COPY --from=build /usr/src/app/openapi ./openapi

EXPOSE 4000
CMD ["node", "dist/server.js"]
