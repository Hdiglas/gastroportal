# Gastroportal / Gastromail
FROM node:22-alpine

WORKDIR /app

# Build-Tools für native Module (z.B. mailparser)
RUN apk add --no-cache python3 make g++

# Dependencies
COPY package*.json ./
RUN npm ci --omit=dev --ignore-scripts

# App + Prisma
COPY . .
RUN npx prisma generate && npm run build

EXPOSE 3000

CMD ["npm", "start"]
