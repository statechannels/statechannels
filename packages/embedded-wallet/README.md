# 💼 Embedded Wallet

This package allows you to use a State Channels-enabled dapp with wallets that do not yet support the protocol.

## Usage

For now, it's available for local/development use only.

1. Include the following script in your dapp's web front-end:

```html
<script src="http://localhost:3000/wallet.js"></script>
```

2. Add a `postMessage` call anywhere your dapp needs to talk to the wallet. You should be good to go with simply
   requesting `chan_allocate`:

```js
window.postMessage({
  jsonrpc: "2.0",
  method: "chan_allocate",
  params: {
    /*...*/
  },
  id: someUniqueNumericId()
});
```

3. Run your dapp.

4. Run the `embedded-wallet` package using `yarn start` on this directory or `yarn run:ewt` on the monorepo's root.
   Make sure the `embedded-wallet` runs on the same address as seen in the `script` include above. If not, adjust
   accordingly.

## Available commands

> ⚠ These commands are _not_ final and will very much likely change in future versions.
> ⚠ For now, `params` and `id` are not important, you can pretty much skip them and the request will work.

### `chan_allocate`

Opens the Budget Allocation dialog.

### `chan_noHub`

Forcibly shows the "Not Connected to a Hub" screen.

### `chan_connect`

Forcibly shows the "Connect to Hub" screen.
