# Unit testing and running the hub locally

## Setup

### postgresql

The simplest way to get this going on a mac is to install the [postgres app](https://postgresapp.com)

### .env

You'll notice a set files with the `.env` prefix. The `.env` file contains environment variables that apply to all users across all environments. To add an environment variable specific to your local setup, add the variable to `.env.NODE_ENV.local` where NODE_ENV can be test, development, etc.

#### Example local env file

If you have `NODE_ENV=development`, you'd have a local file named `.env.development.local` with similar content to the following:

```
SERVER_DB_HOST=localhost
# assuming your postgres instance is open on port 5432
SERVER_DB_PORT=5432
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

### Establishing a virtual channel between clients through the hub

To connect to the `hub` from the browser `wallet`, the `hub` and the browser `wallet` need to:

- Share the state-channel address of the hub. A good way to do so is to create a `.env.development.local` in the monorepo root with `SERVER_ADDRESS` and `SERVER_PRIVATE_KEY` defined.
- Point to the same local Ganache server. Configure your `.env` files accordingly. This should work without any modifications.
- Point to the same shared local Ganache server. This should work without any modifications. To see which ports are being used by the `hub` and `wallet`, and to verify they are the same, you can reference the `GANACHE_PORT` environment variable which by default is set in `.env` of each package.
- Point to the same contract addresses on Ganache. This will be the case if the hub and the client wallet point to the same Ganache server.

You will also need to make sure that the hub's blockchain address has funds. The default hub blockchain address `SERVER_SIGNER_ADDRESS` is in [constants.ts](https://github.com/statechannels/monorepo/blob/master/packages/hub/src/constants.ts). This address will have funds by default. Ganache is started with [these funded private keys](https://github.com/statechannels/monorepo/blob/hub-address/packages/devtools/src/constants.ts). Consequently, feel free to substitute any of these address/private key pairs for `SERVER_SIGNER_ADDRESS` and `SERVER_SIGNER_PRIVATE_KEY`.

## Testing

For any environment variables specific to local setup, such as postgres host or port, do not modify `.env` files checked into the repository. Instead, add the variables to `.env.test.local` (or to other local `.env` files). Specifically, you might want to override `SERVER_DB_HOST` and `SERVER_DB_PORT`.

```
yarn install
NODE_ENV=test yarn db:create
yarn test:ci
```

## Deploying

Heroku runs a production version of the build `Dockerfile.hub.staging` in the root of the repo. To create a deployment you must:

**Build the Dockerfile locally, by running**

```bash
docker build -t registry.heroku.com/statechannels-hub-staging/statechannels-hub -f Dockerfile.hub.staging .
```

**Push the container to the Heroku Container Registry**

```bash
docker push registry.heroku.com/statechannels-hub-staging/statechannels-hub
```

**Release the container on Heroku (a.k.a., trigger the dyno to update)**

```bash
heroku container:release -a statechannels-hub-staging statechannels-hub
```

To run a test deploy, run

```
 // only needs to be run once to create a local "production" database
$ NODE_ENV=production yarn db:create
// Starts a local server serving the app
$ NODE_ENV=production heroku local
```

### Heroku Migrations

The first time you deploy to Heroku, you'll need to run migrations. To do this, you need to run the migrations _locally_ with the remote database URL from Heroku. Here is a command that should do that for you:

```bash
DATABASE_URL=$(heroku config:get DATABASE_URL -a statechannels-hub-staging)?ssl=true yarn db:migrate
```
