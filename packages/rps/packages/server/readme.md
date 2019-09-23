## Requirements

### postgresql

The simplest way to get this going on a mac is to install the [postgres app](https://postgresapp.com)

### heroku

https://devcenter.heroku.com/articles/heroku-cli

### .env

Copy `.env.example` to `.env`, and make it your own.

## Setup

```
$ npm i -g yarn
$ yarn install
// you will need to run `yarn db:drop` if the database already exists
$ NODE_ENV=development yarn db:create
$ NODE_ENV=development yarn db:migrate
$ NODE_ENV=development yarn db:seed
$ yarn server:watch (will rebuild app on file change)

```

### Interacting with the server from a browser

To play against the server from the browser client, the server and the browser need to:

- Share the state-channel address of the server/hub. A good way to do so is to create a `.env.development.local` in the monorepo root with HUB_ADDRESS and HUB_PRIVATE_KEY defined.
- Point to the same local Ganache server. Configure your `.env.*.local` files accordingly.
- Point to the same contract addresses on Ganache. For now, run something like `cp ../wallet/build/contracts/* build/contracts/` after deploying the contracts from the wallet.
- The server relies on transpiled wallet code. If there are transpile errors when building the server, try transpiling the wallet package by running `npx tsc` in `packages/wallet`.
  Another option is to leave `npx tsc --watch` running in `packages/wallet` to ensure that the transpiled project is always up to date.

You will also need to make sure that the server's address has funds. You can find the server address in [constants.ts](https://github.com/magmo/node-bot/blob/master/src/constants.ts)

## Testing

```
yarn install
NODE_ENV=test yarn db:create
yarn test
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
