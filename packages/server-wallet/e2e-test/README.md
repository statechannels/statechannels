# e2e-test

```
      +-------------+                 +-------------+
      | Ping Wallet |                 | Pong Wallet |
      +-+-+----+-+--+                 +-+-+----+-+--+
        ^ |    ^ |                      ^ |    ^ |
        | |    | |                      | |    | |
create  0 1    8 9 pushMessage    join  5 6    3 4 pushMessage
Channel | |    | |              Channel | |    | |
        | v    | v                      | v    | v
      +-+-+----+-+--+                 +-+-+----+-+--+
      |             +-------2-------->+             |
      | Ping Client |  POST /inbox    | Pong Client |
      |             +<------7---------+             |
      +-------------+                 +-------------+

```

This is a reference test for how two clients, communicating to each other over HTTP, may write clients to update the state of a pre-existing channel.

- `pong` is an Express server which accepts a single kind of request. It accepts `POST` requests of JSON-RPC encoded data at `/inbox` with the `SendMessage` method and parameters being of the type `Message`. It is expected to take this HTTP request and place the message inside it's wallet, and then respond to this same HTTP request with a response that includes any `MessageQueued` messages from the wallet.

- `ping` is just a simple class which wraps the `Wallet` and exposes a method called `ping` that generates a state channel update to be sent to the `pong`'s HTTP server. 

The end-to-end test at this point simply spins up the `pong` server and then creates a `PingClient` which "pings" the `pong` and gets a signed state update back in return acknowledging the state channel update. It's assumed that both clients already have an open channel with each other stored in their respective databases.

### next steps

This folder should be extracted outside of the `server-wallet` repo at a later point. Logical components are a TypeScript payment client (i.e., the "ping") and an HTTP payment receiving server (i.e., the "pong"). The end-to-end should be a separate package which imports each client and runs through this sort of testing scenario.

### pong database

You must create a new database locally called 'pong', like so:

```bash
createdb pong
SERVER_DB_NAME=pong NODE_ENV=development yarn db:migrate
```