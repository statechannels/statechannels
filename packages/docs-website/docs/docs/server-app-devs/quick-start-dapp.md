---
id: quick-start-dapp
title: Quick start (application)
---

import useBaseUrl from '@docusaurus/useBaseUrl';

By depending on our node.js state channels wallet library, you will be able to rapidly develop a statechannels-powered server application that does not need to manage keys, interface with an ethereum provider or understand nitro-protocol at all. Instead, it only needs to target the @statechannels/server-wallet [API](/typescript-api/server-wallet).

:::note
This section is for developers building server-based Dapps that require a server-based state channels wallet. The instructions are incomplete and should not serve as a reference for deploying your application to production. If you want to do that, please get in touch with our team.
Browser-based applications should use a state channel browser wallet (coming soon).
:::

## Installing

You will want to add `@statechannels/server-wallet` to your project:

```console
> yarn add @statechannels/server-wallet
```

## Requirements

The server wallet requires you to bring your own database server, which (for now) should be a postgres database server.

## Instantiating a wallet

Simply import the `Wallet` class, and pass some required options to the `create` method.

```ts
import {Wallet, IncomingServerWalletConfig} from '@statechannels/server-wallet';

const opts: IncomingServerWalletConfig = {
  databaseConfiguration: {
    pool: undefined, // for a single threaded wallet
    debug: false,
    connection: {host: 'localhost', port: 5432, user: 'postgres'}
  },
  networkConfiguration: {
    chainNetworkID: 5 // e.g. for Goerli
  }
};

const wallet = await Wallet.create(opts);
```
