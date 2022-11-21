FROM node:16

# Create app directory
WORKDIR /usr/src/app

# Bundle app source
COPY ./server.js .

EXPOSE 8080
CMD [ "node", "server.js" ]