FROM node:10.16.3

ARG BRANCH=sp/headfull-docker-george
# this allows us to make an image with whatever branch we want
# using --build-arg BRANCH=name_of_the_branch
# e.g. docker build -t dapp --build-arg BRANCH=master .

RUN  apt-get update \
     # See https://crbug.com/795759
     && apt-get install -yq libgconf-2-4 \
     # Install latest chrome dev package, which installs the necessary libs to
     # make the bundled version of Chromium that Puppeteer installs work.
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

ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD true

COPY entrypoint.sh /entrypoint.sh
ENTRYPOINT ["/entrypoint.sh"]