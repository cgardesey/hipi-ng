FROM node:stretch-slim

WORKDIR /usr/src/app

COPY package*.json ./

RUN npm install

COPY . .

EXPOSE 6022
CMD ["npm", "start"]