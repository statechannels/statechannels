# 🔌 IFrame Channel Provider

It exposes a global object called `channelProvider` that implements the [EIP 1193](https://github.com/ryanio/EIPs/blob/master/EIPS/eip-1193.md) standard.

In the near future, it'll feature-detect if a wallet such as MetaMask has state channels support. If it does, the package does nothing; if it doesn't, it'll plug in the Embedded Wallet into a dApp.

## Usage

Include the `iframe-channel-provider.min.js` file in your app via a `script` tag:

```html
<script src="node_modules/@statechannels/iframe-channel-provider/dist/iframe-channel-provider.min.js"></script>
```

Then, enable the provider, passing on an URL to where the Wallet UI hosted.

> _This isn't final behavior. Eventually, the UI will be integrated inside a wallet like MetaMask, and the URL won't be necessary.
> Right now, we need this because of the usage of the `.postMessage()` API + CORS requirements._

```js
window.channelProvider.mountWalletComponent('http://xstate-wallet.statechannels.org');
```

In order for the wallet connection to be useful, you'll want to enable it by calling `.enable()`. This method tells the wallet to establish a connection with the user's Web3 provider.

### API

| Method                                                                      | Description                                                                                                       |
|-----------------------------------------------------------------------------|-------------------------------------------------------------------------------------------------------------------|
| `mountWalletComponent(url?: string)`                                        | Configures the dApp to be able to send/receive JSON-RPC messages.                                                 |
| `enable()`                                                                  | Sends an `EthereumEnable` API call to the wallet.                                                                 |
| `send<ResultType>(method: string, params?: any[]`): Promise<ResultType>     | Sends a message to the wallet using JSON-RPC and returns the result, if any.                                      |
| `on(eventNameOrSubscriptionId: string, callback?: Function): void`          | Allows to register for events or subscriptions received from the wallet.                                          |
| `off(eventNameOrSubscriptionId: string, callback?: Function): void`         | Allows to un-register for events or subscriptions received from the wallet.                                       |
| `subscribe(subscriptionType: string, callback?: Function): Promise<string>` | Allows to subscribe to an event feed, returns a `subscriptionId` that can be used later with `.on()` or `.off()`. |
| `unsubscribe(subscriptionId: string)`                                       | Removes all event listeners tied to a given `subscriptionId` and stops listening events on the requested feed.    |
