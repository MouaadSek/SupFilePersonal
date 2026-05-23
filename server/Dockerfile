FROM node:20-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --omit=dev

COPY . .

RUN mkdir -p storage

EXPOSE 3000

CMD ["node", "src/app.js"]
