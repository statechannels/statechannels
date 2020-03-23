# Unit testing and running the hub locally

## Setup

### .env

You'll notice a set files with the `.env` prefix. The `.env` file contains environment variables that apply to all users across all environments. To add an environment variable specific to your local setup, add the variable to `.env.NODE_ENV.local` where NODE_ENV can be test, development, etc.

### Local Ganache

Make sure a local ganache instance is running by following [the instructions at the root of the repo](../../readme.md#Development-Flow)

## Run the hub

```
$ npm i -g yarn
$ yarn install
$ yarn hub:watch (will rebuild app on file change)
```

### Establishing a virtual channel between clients through the hub

**NOTE**: Running this package makes a connection to a shared external Firebase database. So, to avoid colliding with other developers also running this package, set the environment variable `HUB_PARTICIPANT_ID` to one that is likely not being used by any other developer for local development purposes.

To connect to the `hub` from the browser `wallet`, the `hub` and the browser `wallet` need to:

- Share the state-channel address of the hub. A good way to do so is to create a `.env.development.local` in the monorepo root with `HUB_CHANNEL_PK`defined.
- Point to the same local Ganache server. Configure your `.env` files accordingly. This should work without any modifications.
- Point to the same shared local Ganache server. This should work without any modifications. To see which ports are being used by the `hub` and `wallet`, and to verify they are the same, you can reference the `GANACHE_PORT` environment variable which by default is set in `.env` of each package.
- Point to the same contract addresses on Ganache. This will be the case if the hub and the client wallet point to the same Ganache server.

You will also need to make sure that the hub's blockchain address has funds. The default hub blockchain address is calculated from the HUB_CHAIN_PK in [constants.ts](https://github.com/statechannels/monorepo/blob/master/packages/simple-hub/src/constants.ts#L13). This address will have funds by default. Ganache is started with [these funded private keys](https://github.com/statechannels/monorepo/blob/master/packages/devtools/src/constants.ts). Consequently, feel free to substitute any of these private keys for `HUB_CHAIN_PK`.

## Testing

For any environment variables specific to local setup, do not modify `.env` files checked into the repository. Instead, add the variables to `.env.test.local` (or to other local `.env` files).

```
yarn install
yarn test:ci
```

## Deploying

Heroku runs a production version of the build `Dockerfile.hub.staging` in the root of the repo. To create a deployment you must:

**Build the Dockerfile locally, by running**

```bash
docker build -t registry.heroku.com/simple-hub-staging/simple-hub -f Dockerfile.simple-hub.staging .
```

**Push the container to the Heroku Container Registry**

```bash
docker push registry.heroku.com/simple-hub-staging/simple-hub
```

**Release the container on Heroku (a.k.a., trigger the dyno to update)**

```bash
heroku container:release -a simple-hub-staging simple-hub
```

To run a test deploy, run

```
// Starts a local server serving the app
$ NODE_ENV=production heroku local
```
