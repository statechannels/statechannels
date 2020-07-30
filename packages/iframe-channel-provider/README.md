# 🔌 IFrame Channel Provider

It exposes a global object called `channelProvider` that implements the [EIP 1193](https://github.com/ryanio/EIPs/blob/master/EIPS/eip-1193.md) standard.

## Usage

Include the `iframe-channel-provider.min.js` file in your app via a `script` tag:

```html
<script src="node_modules/@statechannels/iframe-channel-provider/dist/iframe-channel-provider.js"></script>
```

Then, enable the provider, passing on an URL to where the Wallet UI hosted.

```js
window.channelProvider.mountWalletComponent('http://xstate-wallet.statechannels.org');
```

In order for the wallet connection to be useful, you'll want to enable it by calling `.enable()`. This method tells the wallet to establish a connection with the user's Web3 provider.

For more information see https://docs.statechannels.org
