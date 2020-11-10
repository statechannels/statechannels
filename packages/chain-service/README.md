# ⛓ Chain Service

The `chain-service` is a standalone component that enables a State Channels wallet to communicate to an ethereum-based blockchain. It's primary responsibilities are:

- Relay transactions to the chain for channel deposits and withdrawals
- Watch for events related to channels such as those related to deposits and withdrawals
- Fetch bytecode for existing on-chain contracts that channels may use as their app definition

## Usage

You can use the `chain-service` by requiring it in a file and attaching it to the `chainService` property of a [`@statechannels/server-wallet`](https://github.com/statechannels/statechannels/tree/master/packages/server-wallet/) like so:

```ts
import { ChainService } from "@statechannels/chain-service";

const chainService = new ChainService(rpcEndpoint, privateKey);

const wallet = new Wallet({...config, chainService});
```

You must provide an RPC Endpoint (e.g., `http://localhost:8545`) and a private key for an Ethereum account with some ETH that can send transactions.

## Features

### Calls
- [x] Triggering a call to `deposit`
- [x] Triggering a call to `concludeAndWithdraw`
- [ ] Triggering a call to `forceMove`
- [ ] Triggering a call to `checkpoint`
- [ ] Triggering a call to `respond`

### Monitoring
- [x] Monitoring for `Deposit` events
- [x] Monitoring for `AssetTransferred` events
- [ ] Monitoring for `ChallengeRegistered` events
- [ ] Monitoring for `ChallengeCleared` events
- [ ] Monitoring for `Concluded` events

### Communication
- [x] Same-process
- [ ] Cross-process

## FAQ

### Why is this a separate package?

1. At the moment, the `chain-service` is tightly coupled to the `server-wallet` codebase but not to the `server-wallet` _process_. In production scenarios the `server-wallet` might be horizontally scaled to support several concurrent updates to a large number of channels, but you might only want a single connection to a blockchain monitoring and managing all of these channels.

2. We expect that other wallets in the future (e.g., a browser-based wallet) may want to re-use this same service and plug it in to that environment similarly to how the `server-wallet` does now.

3. The set of responsibilities this package controls are actually the only things which link a state channels wallet to a particular blockchain. In the future we may want to write a version of this package that connects to alternative blockchain-like backends such as [Optimism](http://optimism.io/) or [zkSync](https://zksync.io/) which would have different implementations for relaying transactions and monitoring the movement of funds. This package being de-coupled helps development move forward with less potential for unnecessary coupling to the implementation of the `server-wallet`, or any other wallet.