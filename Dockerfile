FROM node:18-alpine AS frontend-build

WORKDIR /frontend
COPY frontend/package*.json ./
RUN npm install
COPY frontend/ ./
RUN npm run build

FROM node:18-alpine

WORKDIR /app

COPY backend/package*.json ./
RUN npm install --production

COPY backend/ ./

COPY --from=frontend-build /frontend/build ./frontend/build

RUN mkdir -p data

EXPOSE 3001

CMD ["node", "src/server.js"]
