# e2e-test

This is a reference test for how two clients, communicating to each other over HTTP, may write clients to update the state of a pre-existing channel.

- `pong` is an Express server which accepts a single kind of request. It accepts `POST` requests of JSON-RPC encoded data of a single type, with method `receiveMessage` and parameters being of the type `Message`. It is expected to take this HTTP request and place the message inside it's wallet, and then respond to this same HTTP request with a response that includes any `MessageQueued` messages from the wallet.

- `ping` is just a simple class which wraps the `Wallet` and exposes a method called `ping` that generates a state channel update to be sent to the `pong`'s HTTP server. 

The end-to-end test at this point simply spins up the `pong` server and then creates a `PingClient` which "pings" the `pong` and gets a signed state update back in return acknowledging the state channel update. It's assumed that both clients already have an open channel with each other stored in their respective databases.