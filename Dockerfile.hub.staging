FROM counterfactual/statechannels:0.5.13
LABEL maintainer="Liam Horne <liam@l4v.io>" 

WORKDIR /statechannels/hub

# ASSUMPTIONS
#
# - That ./packages/hub has been built, so a lib directory exists
# - That ./packages/nitro-protocol has been built, so the .json artifacts exist

# TODO: Add package.json first, then do dependencies, then do rest of code

COPY ./packages/hub /statechannels/hub
COPY ./packages/nitro-protocol /statechannels/nitro-protocol

# Remove the nitro-protocol dependency from @statechannels/hub
RUN sed -ie "/@statechannels\/nitro-protocol/d" package.json

# Remove the devtools devDependency from @statechannels/hub (avoid resolution)
RUN sed -ie "/@statechannels\/devtools/d" package.json

# Install production dependencies for hub
# Estimate 82 seconds for this to run
RUN yarn --production --prefer-offline

# Run added dependnencies because of configureEnvVariables
# Estimate 16 seconds
RUN yarn add dotenv dotenv-expand

# Copy nitro-protocol into dependencies of hub manually
RUN mkdir ./node_modules/@statechannels && \
    mv /statechannels/nitro-protocol ./node_modules/@statechannels

# Set entrypoint to basic shell for ease-of-use on Heroku
ENTRYPOINT ["/bin/sh", "-c"]

# Main hub startup
CMD ["node", "./lib/hub/server.js"]