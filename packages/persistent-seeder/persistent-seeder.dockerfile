FROM circleci/node:10.16.3-browsers
USER root
ENV DISPLAY :99.0

RUN  apt-get install -y xvfb libudev-dev

WORKDIR /statechannels/monorepo

# Copy the necessary packages
COPY .env.* ./
COPY *.json ./
COPY yarn.lock ./
COPY ./packages/devtools packages/devtools/
COPY ./packages/persistent-seeder/ packages/persistent-seeder/
COPY ./packages/channel-provider packages/channel-provider/
COPY ./packages/client-api-schema packages/client-api-schema/
COPY ./packages/e2e-tests packages/e2e-tests/

# Add non-root, set permissions, switch user
RUN useradd --create-home --no-log-init --shell /bin/bash seeder
RUN chown -R seeder: /statechannels/monorepo
USER seeder

# Install dependencies
RUN yarn

WORKDIR /statechannels/monorepo/packages/persistent-seeder

COPY ./packages/persistent-seeder/entrypoint.sh /entrypoint.sh

ENTRYPOINT ["/entrypoint.sh"]