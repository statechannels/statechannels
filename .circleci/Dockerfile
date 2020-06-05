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

RUN curl -o /usr/bin/solc -fL https://github.com/ethereum/solidity/releases/download/v0.6.9/solc-static-linux \
    && chmod u+x /usr/bin/solc

# install node 10.x and yarn 1.17.3
RUN npm install -g yarn@1.17.3
