# Unit testing and running the hub locally

## Setup

### postgresql

The simplest way to get this going on a mac is to install the [postgres app](https://postgresapp.com)

### .env

You'll notice a set files with the `.env` prefix. The `.env` file contains environment variables that apply to all users across all environments. To add an environment variable specific to your local setup, add the variable to `.env.NODE_ENV.local` where NODE_ENV can be test, development, etc.

#### Example local env file

If you have `NODE_ENV=development`, you'd have a local file named `.env.development.local` with similar content to the following:

```
HUB_DB_HOST=localhost
# assuming your postgres instance is open on port 5432
HUB_DB_PORT=5432
```

### Local Ganache

Make sure a local ganache instance is running by following [the instructions at the root of the repo](../../readme.md#Development-Flow)

## Run the hub

```
$ npm i -g yarn
$ yarn install
// you will need to run `yarn db:drop` if the database already exists
$ NODE_ENV=development yarn db:create
$ NODE_ENV=development yarn db:migrate
$ NODE_ENV=development yarn db:seed
$ yarn hub:watch (will rebuild app on file change)

```

### Interacting with the hub from a browser

**NOTE**: it is important to define a unique `HUB_ADDRESS` if others are running the hub locally since all hub instances use the same Firebase realtime database.

To connect to the `hub` from the browser `wallet`, the `hub` and the browser `wallet` need to:

- Share the state-channel address of the hub. A good way to do so is to create a `.env.development.local` in the monorepo root with `HUB_ADDRESS` and `HUB_PRIVATE_KEY` defined.
- Point to the same local Ganache server. Configure your `.env` files accordingly. This should work without any modifications.
- Point to the same contract addresses on Ganache. This will be the case if the hub and the client wallet point to the same Ganache server.

You will also need to make sure that the hub's blockchain address has funds. The default hub blockchain address `HUB_SIGNER_ADDRESS` is in [constants.ts](https://github.com/statechannels/monorepo/blob/master/packages/hub/src/constants.ts)

## Testing

For any environment variables specific to local setup, such as postgres host or port, do not modify `.env` files checked into the repository. Instead, add the variables to `.env.test.local` (or to other local `.env` files). Specifically, you might want to override `HUB_DB_HOST` and `HUB_DB_PORT`.

```
yarn install
NODE_ENV=test yarn db:create
yarn test:ci
```

## Deploying

Heroku is configured to automatically deploy from the watched `deploy` branch.
To run a test deploy, run

```
 // only needs to be run once to create a local "production" database
$ NODE_ENV=production yarn db:create
// Starts a local server serving the app
$ NODE_ENV=production heroku local
```
