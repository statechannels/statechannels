FROM node:10.16.3

ARG BRANCH=sp/headfull-ci
# this allows us to make an image with whatever branch we want
# using --build-arg BRANCH=name_of_the_branch
# e.g. docker build -t dapp --build-arg BRANCH=master .

RUN apt-get update && apt-get install -yq gconf-service libasound2 libatk1.0-0 libc6 libcairo2 libcups2 libdbus-1-3 libexpat1 libfontconfig1 libgcc1 libgconf-2-4 libgdk-pixbuf2.0-0 libglib2.0-0 libgtk-3-0 libnspr4 libpango-1.0-0 libpangocairo-1.0-0 libstdc++6 libx11-6 libx11-xcb1 libxcb1 libxcomposite1 libxcursor1 libxdamage1 libxext6 libxfixes3 libxi6 libxrandr2 libxrender1 libxss1 libxtst6 ca-certificates fonts-liberation libappindicator1 libnss3 lsb-release xdg-utils wget x11vnc x11-xkb-utils xfonts-100dpi xfonts-75dpi xfonts-scalable xfonts-cyrillic x11-apps xvfb

RUN  wget -q -O - https://dl-ssl.google.com/linux/linux_signing_key.pub | apt-key add - \
     && sh -c 'echo "deb [arch=amd64] http://dl.google.com/linux/chrome/deb/ stable main" >> /etc/apt/sources.list.d/google.list' \
     && apt-get update \
     && apt-get install -y google-chrome-stable --no-install-recommends \
     && rm -rf /var/lib/apt/lists/*
     
# RUN useradd -r -u 1001 appuser -m
# USER appuser
RUN mkdir /home/appuser
WORKDIR /home/appuser
RUN  git clone -b $BRANCH --single-branch https://github.com/statechannels/monorepo.git monorepo
WORKDIR /home/appuser/monorepo
# ADD https://api.github.com/repos/statechannels/monorepo/git/refs/heads/$BRANCH version.json
RUN  git pull 
RUN  yarn
# the following lines copy stuff into the image manually, so that we can try things without commiting and pushing
# COPY .env.circle-integration-w3t /home/appuser/monorepo/.env.circle-integration-w3t
# COPY ./puppeteer/helpers.ts /home/appuser/monorepo/packages/e2e-tests/puppeteer/helpers.ts

ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD true
ENV DISPLAY=:99.0
ENV PUPPETEER_EXEC_PATH=google-chrome-stable



WORKDIR /home/appuser/monorepo/packages/e2e-tests
COPY entrypoint.sh /entrypoint.sh
ENTRYPOINT ["/entrypoint.sh"]