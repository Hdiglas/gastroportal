# Gastroportal / Gastromail
FROM node:22-alpine

WORKDIR /app

# Dependencies
COPY package*.json ./
RUN npm ci --omit=dev

# App + Prisma
COPY . .
RUN npx prisma generate && npm run build

EXPOSE 3000

CMD ["npm", "start"]
