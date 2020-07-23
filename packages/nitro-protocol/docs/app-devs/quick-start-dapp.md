---
id: quick-start-dapp
title: Quick start (Dapp)
---

By using our reference state channels wallet implementation, you will be able to rapidly develop a statechannels-powered Dapp that does not need to manage keys, interface with an ethereum provider or understand nitro-protocol at all. Instead, it only needs to target our channel-client API.

## Installing

You will want to add both `@statechannels/channel-client` and `@statechannels/iframe-channel-provider` to your project:

```console
> yarn add @statechannels/channel-client @statechannels/iframe-channel-provider
```

Think about the client as exposing a friendly API for your Dapp, and the provider as a lower level bit of plumbing that it uses to connect to our wallet.

The wallet code will be downloaded by the browser and executed inside an iframe. The channel-provider uses `postMessage` under the hood to communicate with the wallet. Set it up as follows:

```typescript
// Attaches the channel provider to the window object
require('@statechannels/iframe-channel-provider');
```

## Enabling the channel provider

The channel provider needs to be pointed at our hosted wallet:

```typescript
window.channelProvider.mountWalletComponent('https://xstate-wallet.statechannels.org/');
```

This step mounts the wallet iframe in your Dapp, configures communication and performs an initial handshake with the wallet.

At some point in your user flow, you will want to enable the wallet:

```typescript
window.channelProvider.enable();
```

If everything is setup correctly, you should see the statechannels wallet UI:

![](assets/wallet-ui.png)
