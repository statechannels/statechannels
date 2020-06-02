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
$ yarn watch (will rebuild app on file change)
```

- To enable logging to the console, set `LOG_DESTINATION=console`
- To enable logging to a file, set `LOG_DESTINATION=someFilenameOtherThanConsole`

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

Heroku runs a production version of the build `docker/simple-hub.dockerfile`. To deploy:

- The preferred method is to use the [deploy](https://github.com/statechannels/monorepo/tree/deploy) branch. Push the desired commit to the branch, and the `release-hub` CicrcleCI job will build and release the hub.
- The manual way is to run `docker/build-push-release.sh`. The key point to take in is that this relies on pre-transpiled monorepo packages (nitro-protocol, wire-format, and simple-hub). If the transpiled directories are out of date or contain development changes, the deploy script will push those to the production heroku. The safest way to use the build script is to:
  1. Remove the build directories for all monorepo packages that the hub uses. These are typically named `build` or `lib`.
  1. Run `yarn` in monorepo root. This will rebuild all monorepo packages via `yarn prepare` automatically triggered by `yarn`.
  1. Run `docker/build-push-release.sh`.

## Running locally

To start a hub in a docker container locally with development environment variables:

```
docker run -it --env-file .env.development registry.heroku.com/simple-hub-production/simple-hub:latest
```

To start a docker container locally without starting the hub, append `bash` to the command above. This is handy when you would like to poke around the container or try running commands in the container:

```
docker run -it --env-file .env.development registry.heroku.com/simple-hub-production/simple-hub:latest bash
```
