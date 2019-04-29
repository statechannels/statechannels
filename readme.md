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
$ yarn watch-server (will rebuild app on file change)

// Opening a channel using data from `test_data.ts` and `rps_test_data.ts`

$ curl -X POST -H "Content-Type: application/json" -H "Accept:application/json" -d "$(cat samples/open_channel.ledger.json)" http://localhost:3002/api/v1/ledger_channels

$ curl -X POST -H "Content-Type: application/json" -H "Accept:application/json" -d "$(cat samples/open_channel.rps.json)" http://localhost:3002/api/v1/rps_channels
$ curl -X POST -H "Content-Type: application/json" -H "Accept:application/json" -d "$(cat samples/update_channel.rps.json)" http://localhost:3002/api/v1/rps_channels
```

### Playing against the server

To play against the server from the client, the server's prebuilt contracts will need
to know the addresses of the deployed contracts on the local ganache network shared between this app and the client app.

In addition to the above development setup, after deploying wallet contracts to your local ganache server, add the wallet artifact's network data to this project's prebuilt contracts:

```
chmod +x bin/splice-networks.sh
PATH_TO_WALLET_CONTRACTS=${PATH_TO_WALLET_PROJECT}/build/contracts yarn splice-networks
```

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
