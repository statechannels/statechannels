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

For any environment variables specific to local setup, such as postgres host or port, do not modify `.env` files checked into the repository. Instead, add the variables to `.env.test.local` (or to other local `.env` files). Specifically, you might want to override `SERVER_DB_HOST` and `SERVER_DB_PORT`.

```
yarn install
NODE_ENV=test yarn db:create
yarn test:ci
```
