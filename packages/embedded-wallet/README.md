# 💼 Embedded Wallet

This package allows you to use a State Channels-enabled dapp with wallets that do not yet support the protocol.

## Usage

1. Include the following script in your dapp's web front-end:

```html
<script src="https://sc-embedded-wallet.netlify.com/wallet.js"></script>
<script>
  // Enables the Channel Provider. This allows to intercept messages sent via postMessage.
  window.channelProvider.enable().then(() => {
    // ...
  });
</script>
```

2. Add a `send` call anywhere your dapp needs to talk to the wallet. You should be good to go with simply
   requesting `chan_allocate`:

```js
window.channelProvider.send('chan_allocate', [params]).then(response => {
  // Do something with the response.
});
```

3. Run your dapp.

4. Run the `embedded-wallet` package using `yarn start` on this directory or `yarn run:ewt` on the monorepo's root.
   Make sure the `embedded-wallet` runs on the same address as seen in the `script` include above. If not, adjust
   accordingly.

## Available commands

> ⚠ These commands are _not_ final and will very much likely change in future versions.

### `chan_allocate`

Opens the Onboarding flow.
