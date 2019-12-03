# Unit testing and running the hub locally

## Setup

### postgresql

The simplest way to get this going on a mac is to install the [postgres app](https://postgresapp.com)

### .env

You'll notice a set files with the `.env` prefix. The `.env` file contains environment variables that apply to all users across all environments. To add an environment variable specific to your local setup, add the variable to `.env.NODE_ENV.local` where NODE_ENV can be test, development, etc.

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

To play against the hub from the browser client, the hub and the browser need to:

- Share the state-channel address of the hub. A good way to do so is to create a `.env.development.local` in the monorepo root with HUB_ADDRESS and HUB_PRIVATE_KEY defined.
- Point to the same local Ganache server. Configure your `.env.*.local` files accordingly.
- Point to the same contract addresses on Ganache.

You will also need to make sure that the hub's address has funds. You can find the hub address in [constants.ts](https://github.com/magmo/node-bot/blob/master/src/constants.ts)

## Testing

For any environment variables specific to local setup, such as postgres host or port, do not modify `.env` files checked into the repository. Instead, add the variables to `.env.test.local` (or to other local `.env` files).

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
