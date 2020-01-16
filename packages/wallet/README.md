<h1 align="center">
The State Channels Wallet
</h1>

[![Netlify Status](https://api.netlify.com/api/v1/badges/0e22fa3e-d6a0-4308-8043-5ada4017eee0/deploy-status)](https://app.netlify.com/sites/wallet-statechannels/deploys)

This wallet follows [ForceMove](https://magmo.com/force-move-games.pdf) protocol.

It is used by our games, and is responsible for signing, verifying and storing states that _could_ be submitted to an adjudicator on chain.

![splash](./screens.png "screens")

## To run the wallet on your machine

TBD

## Developer information

First make sure a local ganache instance is running by following [the instructions at the root of the repo](../../readme.md#Development-Flow)

```
// run all tests
yarn test

// run contract tests, in parallel
yarn test:contracts

// run app tests, in parallel
yarn test:app

// run all tests in parallel
yarn test

// run contract tests, in serial
yarn test:ci:contracts

// run app tests, in serial
yarn test:ci:app

// run all tests in serial
yarn test:ci
```

## Integration testing with `puppeteer`

There are a few integration tests inside the [`puppeteer`](./puppeteer) folder which can be run with the `yarn test:puppeteer` script. If you want to run these tests and debug the console of the instantiated Chromium windows at the same time, you might want to use `ts-node`. Here is an example, running the `funding` script.

```bash
NODE_ENV=test yarn ts-node -O '{"module":"commonjs","noUnusedLocals":false}' ./puppeteer/scripts/funding.ts
```

You will want to call `setupBrowser` with the `false` argument to use the Chromium UI on your Mac.

Also, a helpful tip, to avoid the annoying dialog that pops up on Chromium every time (i.e., "Do you want to the application Chromium.app to accept incoming network connections?"), you can follow the instructions presented in [this Github issue](https://github.com/puppeteer/puppeteer/issues/4752).
