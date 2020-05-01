FROM node:10.16.3

ENV DISPLAY :99.0

RUN  apt-get update \
     && apt-get install -yq libgconf-2-4 \
     && apt-get install -y wget xvfb --no-install-recommends \
     && wget -q -O - https://dl-ssl.google.com/linux/linux_signing_key.pub | apt-key add - \
     && sh -c 'echo "deb [arch=amd64] http://dl.google.com/linux/chrome/deb/ stable main" >> /etc/apt/sources.list.d/google.list' \
     && apt-get update \
     && apt-get install -y google-chrome-stable --no-install-recommends \
     && rm -rf /var/lib/apt/lists/*

WORKDIR /statechannels/monorepo

# Copy the necessary packages

COPY .env.* ./
COPY *.json ./
COPY yarn.lock ./
COPY ./packages/devtools packages/devtools/
COPY ./packages/e2e-tests packages/e2e-tests/
COPY ./packages/channel-provider packages/channel-provider/
COPY ./packages/client-api-schema packages/client-api-schema/

# Install dependencies
RUN yarn

WORKDIR /statechannels/monorepo/packages/e2e-tests

COPY ./packages/e2e-tests/persistent-seeder-deployment/entrypoint.sh /entrypoint.sh
ENTRYPOINT ["/entrypoint.sh"]