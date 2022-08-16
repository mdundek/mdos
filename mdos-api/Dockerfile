FROM node:16-alpine

COPY helm /usr/bin
RUN chmod a+x /usr/bin/helm

RUN apk add curl

# Create app directory
WORKDIR /usr/src/app

# Install app dependencies
# A wildcard is used to ensure both package.json AND package-lock.json are copied
# where available (npm@5+)
COPY package*.json ./

RUN npm install
# If you are building your code for production
# RUN npm ci --only=production

# Bundle app source
COPY . .

RUN rm -rf helm
RUN rm -rf .env

EXPOSE 3030
CMD [ "node", "." ]