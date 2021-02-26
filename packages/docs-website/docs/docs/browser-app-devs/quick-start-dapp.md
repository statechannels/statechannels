---
id: quick-start-dapp
title: Quick start (Dapp)
---

import useBaseUrl from '@docusaurus/useBaseUrl';

By using our reference state channels wallet implementation, you will be able to rapidly develop a statechannels-powered Dapp that does not need to manage keys, interface with an ethereum provider or understand nitro-protocol at all. Instead, it only needs to target our channel-client API.

:::note
This section is for developers building browser-based Dapps that require a browser-based state channels wallet.
Server-based applications should use a state channel wallet library (coming soon).
:::

## Installing

You will want to add both `@statechannels/channel-client` and `@statechannels/iframe-channel-provider` to your project:

```console
> yarn add @statechannels/channel-client @statechannels/iframe-channel-provider
```

Think about the client as exposing a friendly API for your Dapp, and the provider as a lower level bit of plumbing that it uses to connect to our wallet.

The wallet code will be downloaded by the browser and executed inside an iFrame. The channel-provider uses `postMessage` under the hood to communicate with the wallet. Set it up as follows:

```typescript
// Attaches the channel provider to the window object
require('@statechannels/iframe-channel-provider');
```

## Enabling the channel provider

The channel provider needs to be pointed at our hosted wallet:

```typescript
await window.channelProvider.mountWalletComponent(
  'https://xstate-wallet-v-0-3-0.statechannels.org'
);
```

This step mounts the wallet iFrame in your Dapp, configures communication and performs an initial handshake with the wallet.

At some point in your user flow, you will want to enable the wallet:

```typescript
await window.channelProvider.enable();
```

If everything is setup correctly, you should see the statechannels wallet UI:

<p align="center">
<img alt="Wallet UI" src={useBaseUrl('img/wallet-ui.png')} className="drop-shadow"/>
</p>

Because this popup will be triggered, to maintain a good UX you should only call `window.channelProvider.enable()` when the user clicks a button.

## App <-> Wallet security

Having the wallet served in an iFrame from a different domain to the app is an important component from a security standpoint. The app can only send and receive messages to the wallet, and cannot otherwise access its code or storage. Furthermore, it means the app <-> wallet communication is cross-origin, and the wallet can associate policies (such as whitelists) and other data (such as channels and keys) to each domain.

Ethereum wallets will typically prompt the user, when triggered by an application, to approve access to the accounts it controls for the domain that application is served from. Wallets should not implicitly trust applications or grant them access to sign away assets, because unknown applications could contain malicious code and put those asssets at risk.

The same is true for our wallet: when the `.enable()` call is made, the user is asked for approval (see above).

There are a few differences between a state channel wallet and an Ethereum wallet, which are important to understand.

Because state channel applications are capable of very rapid throughput of state updates (or "Layer 2 transactions"), it would not be feasible to ask for user approval for each one. It is for this reason that our wallet will create an "ephemeral key" to sign state updates (sliently), instead of using your Ethereum key.

:::important
This ephemeral key is only used for creating signatures that will be recovered in our adjudicator contract, and isn't designed to _directly_ control any on chain funds. When it comes to releasing assets on chain, however, the money still goes to your Ethereum account when your state channel closes.
:::

Our wallet uses the concept of a "Domain Budget" to further reduce the amount of user interaction that is required. The budget can be approved on the user's first visit to an application, and specifies a maximum send and maximum receive amount for each asset type (e.g. ETH). It then only needs to be administered or "topped-up" when the maximum amounts are reached. Otherwise, the wallet will not prompt the user at all when creating and closing channels, but will silently perform the necessary steps to do so. You can see budgets in action by trying out our [Web3Torrent](https://web3torrent.statechannels.org/) app.
