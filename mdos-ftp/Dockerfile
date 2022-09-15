FROM stilliard/pure-ftpd

RUN apt update -y && apt upgrade -y && apt -y install curl dirmngr apt-transport-https lsb-release ca-certificates apt-utils
RUN curl -sL https://deb.nodesource.com/setup_16.x | bash -
RUN apt-get install -y nodejs
RUN apt -y install gcc g++ make

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

RUN rm -rf .env

EXPOSE 3030

CMD [ "node", "." ]