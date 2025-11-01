FROM node:20-alpine
WORKDIR /usr/src/app
RUN npm i -g pnpm
COPY package.json ./
RUN pnpm install --frozen-lockfile=false
COPY . .
EXPOSE 4000
CMD ["pnpm","start:dev"]
