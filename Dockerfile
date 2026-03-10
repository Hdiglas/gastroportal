# Gastroportal / Gastromail
FROM node:22-alpine

WORKDIR /app

# Build-Tools + Docker CLI (für Update-Button)
RUN apk add --no-cache python3 make g++ docker-cli

# Dependencies
COPY package*.json ./
RUN npm ci --ignore-scripts

# App + Prisma
COPY . .
RUN npx prisma generate && npm run build && npm prune --omit=dev

EXPOSE 3000

CMD ["npm", "start"]
