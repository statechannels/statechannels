FROM node:10.16-slim

RUN apt-get update
RUN apt-get install -y \
    ca-certificates \
    g++ \
    gcc \
    git \
    gzip \
    make \
    python \
    ruby-full \
    software-properties-common \
    ssh \
    sudo \
    tar \
    zlib1g-dev

# add ethereum ppa
RUN add-apt-repository ppa:ethereum/ethereum
RUN apt-get update

# there doesn't appear to be any way to specify solc version num
# https://launchpad.net/~ethereum/+archive/ubuntu/ethereum/+packages?field.name_filter=solc&field.status_filter=published&field.series_filter=
RUN apt-get install solc --allow-unauthenticated -y

# install node 10.x and yarn 1.17.3
RUN npm install -g yarn@1.17.3
