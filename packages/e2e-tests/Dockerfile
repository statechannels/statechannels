FROM node:12.16.3

ARG BRANCH=master
# this allows us to make an image with whatever branch we want
# e.g. docker build -t dapp --build-arg BRANCH=master .

RUN  apt-get update \
     && apt-get install -yq libgconf-2-4 \
     && apt-get install -y wget xvfb --no-install-recommends \
     && wget -q -O - https://dl-ssl.google.com/linux/linux_signing_key.pub | apt-key add - \
     && sh -c 'echo "deb [arch=amd64] http://dl.google.com/linux/chrome/deb/ stable main" >> /etc/apt/sources.list.d/google.list' \
     && apt-get update \
     && apt-get install -y google-chrome-stable --no-install-recommends \
     && rm -rf /var/lib/apt/lists/*

RUN  git clone -b $BRANCH --single-branch https://github.com/statechannels/monorepo.git monorepo
WORKDIR /monorepo
ADD https://api.github.com/repos/statechannels/monorepo/git/refs/heads/$BRANCH version.json
RUN  git pull 
RUN  yarn

# the following lines can be used to copy local files into the image, without commiting and pushing into github
# COPY .env.circle-integration-w3t /home/appuser/monorepo/.env.circle-integration-w3t
# COPY ./puppeteer/helpers.ts /home/appuser/monorepo/packages/e2e-tests/puppeteer/helpers.ts

ENV DISPLAY :99.0

WORKDIR /monorepo/packages/e2e-tests

COPY entrypoint.sh /entrypoint.sh
ENTRYPOINT ["/entrypoint.sh"]