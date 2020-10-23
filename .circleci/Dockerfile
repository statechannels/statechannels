FROM node:12.18-slim

RUN apt-get update
RUN apt-get install -y \
    curl \
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

RUN curl -o /usr/bin/solc -fL https://github.com/ethereum/solidity/releases/download/v0.6.12/solc-static-linux \
    && chmod u+x /usr/bin/solc

