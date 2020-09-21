# Unit testing and running the server locally

## Setup

### postgresql

The simplest way to get this going on a mac is to install the [postgres app](https://postgresapp.com)

### .env

TODO: switch to SC_ENV files

You'll notice a set files with the `.env` prefix. The `.env` file contains environment variables that apply to all users across all environments. To add an environment variable specific to your local setup, add the variable to `.env.NODE_ENV.local` where NODE_ENV can be test, development, etc.

#### Example local env file

TODO: switch to SC_ENV files

If you have `NODE_ENV=development`, you'd have a local file named `.env.development.local` with similar content to the following:

```
SERVER_DB_HOST=localhost
# assuming your postgres instance is open on port 5432
SERVER_DB_PORT=5432
```

## Testing

For any environment variables specific to local setup, such as postgres host or port, do not modify `.env` files checked into the repository. Instead, add the variables to `.env.test.local` (or to other local `.env` files). Specifically, you might want to override `SERVER_DB_USER`, `SERVER_DB_HOST` and `SERVER_DB_PORT`.

```
echo "SERVER_DB_USER=postgres" > .env.test.local # you probably need to do at least this (if you're on a mac)
yarn install
NODE_ENV=test yarn db:create
NODE_ENV=test yarn db:migrate
yarn test:ci
```

### Note on `POSTGRES_USER`

On CircleCI we use `POSTGRES_USER` as `root`, as set in the [CircleCI configuration file](../../.circleci/config.yml) in the monorepo root. Since `NODE_ENV` is set to `test` in that environment, `.env.test` is used, which points to `root` as `SERVER_DB_USER`. When testing locally, however, we expect that `NODE_ENV` is `development`, so `.env.development` is used, which uses `postgres` for `SERVER_DB_USER`. We could unite these two by syncronizing CircleCI and our local environments to both use `postgres` as the user.
