FROM counterfactual/statechannels:0.5.13

WORKDIR /statechannels/monorepo

# ASSUMPTIONS
#
# - That ./packages/simple-hub has been built, so a lib directory exists
# - That ./packages/nitro-protocol has been built, so the .json artifacts exist
# - That ./packages/wire-format has been built, so a lib directory exists

# INSTALL DEPENDENCIES
COPY ./package.json /statechannels/monorepo
COPY ./packages/nitro-protocol/package.json packages/nitro-protocol/
COPY ./packages/simple-hub/package.json packages/simple-hub/
COPY ./packages/wire-format/package.json packages/wire-format/

# Remove the devtools and jest-gas-reporter devDependencies from package.json files (avoid resolution)
RUN sed -ie "/@statechannels\/devtools/d" package.json
RUN sed -ie "/@statechannels\/jest-gas-reporter/d" package.json
RUN sed -ie "/@statechannels\/devtools/d" **/*/package.json
RUN sed -ie "/@statechannels\/jest-gas-reporter/d" **/*/package.json

WORKDIR /statechannels/monorepo
# Install production dependencies for simple-hub
RUN yarn --production --prefer-offline
WORKDIR /statechannels/monorepo/packages/simple-hub
# Run added dependencies because of configureEnvVariables
RUN yarn add --ignore-scripts dotenv dotenv-expand


# COPY SOURCE
WORKDIR /statechannels/monorepo
COPY .env.* ./
COPY ./packages/nitro-protocol/ packages/nitro-protocol/
COPY ./packages/simple-hub/ packages/simple-hub/
COPY ./packages/wire-format/ packages/wire-format/

WORKDIR /statechannels/monorepo/packages/simple-hub

# docker-entrypoint.sh starts a shell that execs the list of arguments in CMD
# This works around the following heroku constraint:
# https://devcenter.heroku.com/articles/container-registry-and-runtime#dockerfile-commands-and-runtime
#   CMD will always be executed by a shell ... to execute single binaries or use images without a shell please use ENTRYPOINT
# To interactively debug the container:
# docker run -it registry.heroku.com/simple-hub-staging/simple-hub:latest bash
ENTRYPOINT ["docker/docker-entrypoint.sh"]
CMD ["node", "./lib/server.js"]
