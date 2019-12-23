FROM counterfactual/statechannels:0.5.13
LABEL maintainer="Liam Horne <liam@l4v.io>" 

WORKDIR /statechannels

COPY ./lerna.json /statechannels/lerna.json
COPY ./yarn.lock /statechannels/yarn.lock
COPY ./package.json /statechannels/package.json
COPY ./tsconfig.json /statechannels/tsconfig.json
COPY ./patches /statechannels/patches
COPY ./packages/nitro-protocol /statechannels/packages/nitro-protocol
COPY ./packages/devtools /statechannels/packages/devtools
COPY ./packages/hub /statechannels/packages/hub

# # Necessary because yarn must resolve devDependencies of hub and nitro-protocol
# COPY ./packages/devtools/package.json /statechannels/packages/devtools/package.json

RUN yarn --prefer-offline --frozen-lockfile --production