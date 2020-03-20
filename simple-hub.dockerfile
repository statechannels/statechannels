FROM counterfactual/statechannels:0.5.13

WORKDIR /statechannels/monorepo

# ASSUMPTIONS
#
# - That ./packages/simple-hub has been built, so a lib directory exists
# - That ./packages/nitro-protocol has been built, so the .json artifacts exist

# INSTALL DEPENDENCIES
COPY ./package.json /statechannels/monorepo
COPY ./packages/nitro-protocol packages/nitro-protocol/
COPY ./packages/wire-format packages/wire-format/
COPY ./packages/simple-hub packages/simple-hub/

# Remove the devtools and jest-gas-reporter devDependency from package.json files (avoid resolution)
RUN sed -ie "/@statechannels\/devtools/d" package.json
RUN sed -ie "/@statechannels\/jest-gas-reporter/d" package.json
RUN sed -ie "/@statechannels\/devtools/d" **/*/package.json
RUN sed -ie "/@statechannels\/jest-gas-reporter/d" **/*/package.json

WORKDIR /statechannels/monorepo/packages/simple-hub

# Install production dependencies for simple-hub
RUN yarn --production --prefer-offline

# Run added dependencies because of configureEnvVariables
RUN yarn add --ignore-scripts dotenv dotenv-expand

ENTRYPOINT ["/bin/sh", "-c"]
CMD ["node", "./lib/server.js"]
