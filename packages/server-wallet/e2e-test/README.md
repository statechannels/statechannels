# e2e-test

```
      +--------------+                 +-----------------+
      | Payer Wallet |                 | Receiver Wallet |
      +-+-+----+-+---+                 +-+-+----+-+------+
        ^ |    ^ |                       ^ |    ^ |
        | |    | |                       | |    | |
update  0 1    8 9 pushMessage    update 5 6    3 4 pushMessage
Channel | |    | |               Channel | |    | |
        | v    | v                       | v    | v
      +-+-+----+-+---+                 +-+-+----+-+------+
      |              +-------2-------->+                 |
      | Payer Client |  POST /inbox    | Receiver Client |
      |              +<------7---------+                 |
      +--------------+                 +-----------------+

```

This is a reference test for how two clients, communicating to each other over HTTP, may write clients to update the state of a pre-existing channel.

- `receiver` is an Express server which accepts a single kind of request. It accepts `POST` requests of JSON-RPC encoded data at `/inbox` the JSON encoded data of type `Message`. It is expected to take this HTTP request and place the message inside it's wallet, and then respond to this same HTTP request with a response that includes any `MessageQueued` messages from the wallet.

- `payer` is just a simple class which wraps the `Wallet` and exposes a method called `payer` that generates a state channel update to be sent to the `receiver`'s HTTP server.

The end-to-end test at this point simply spins up the `receiver` server and then creates a `PayerClient` which "payers" the `receiver` and gets a signed state update back in return acknowledging the state channel update. It's assumed that both clients already have an open channel with each other stored in their respective databases.

## Running Locally

```bash
// Ensure database exists and is primed for Payer Client
createdb payer
SERVER_DB_NAME=payer NODE_ENV=development yarn db:migrate

// Ensure database exists and is primed for Receiver Client
createdb receiver
SERVER_DB_NAME=receiver NODE_ENV=development yarn db:migrate

// Run tests
NODE_ENV=development yarn test:e2e
```

### next steps

This folder should be extracted outside of the `server-wallet` repo at a later point. Logical components are a TypeScript payment client (i.e., the "payer") and an HTTP payment receiving server (i.e., the "receiver"). The end-to-end should be a separate package which imports each client and runs through this sort of testing scenario.
