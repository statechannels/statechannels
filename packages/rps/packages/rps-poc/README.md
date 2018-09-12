## Rock Paper Scissors: A Force-Move Games POC

### Setup

1. Add [MetaMask](https://metamask.io/) or an equivalent browser extension that injects a web3 object. 
1. Install yarn
    ```
    brew install yarn
    ```
1. Install dependencies
    ```
    yarn install
    ```

### Developement Info

#### To run a dev server:

1. Start ganache
    * Either using the app
    * Or by running `ganache-cli` in a different tab
2. Run the server:
    ```
    yarn start
    ```
3. In your browser make sure you have the local ganache network (probably `localhost:7546`) selected in metamask
4. You will need to import one of the seed accounts from [`scripts/start.js`](./scripts/start.js) into metamask to have funds to transact.
    1. Open the metamask browser extension
    2. Click on the account icon (circle in the top right)
    3. Select "Import"
    4. Paste in the secret key from [`scripts/start.js`](./scripts/start.js)
5. If you restart ganache, you will need to switch to another network and back in metamask to prevent transactions from failing with "incorrect nonce" errors

#### To build:

1. Update your  `TARGET_NETWORK` in `.env` to a named network from `truffle.js` (default is `ropsten`)
2. Build the application:
    ```
    yarn run build
    ```

#### To deploy smart contracts

1. Add test eth to your account for the deployment using an eth faucet: https://faucet.ropsten.be/
2. Deploy the contracts to the network:
    ```
    # deploy smart contracts to a network
    yarn truffle:migrate --rps:deploymentNetwork=<named network in truffle.ts>
    ``` 
    
#### To run application tests in watch mode:

`yarn run test:app`

#### To run smart contract tests:

`yarn run test:truffle`

#### To run all tests (before submitting a PR):

`yarn run test`

#### To update dependencies:

`yarn install`

#### To add a dependency:

`yarn add [package-name]` - installs the latest version of the package

#### To update the version of a dependency:

`yarn upgrade [package-name@version-number]`

#### Project style

Please use the Sublime/VS Code package _JsPrettier_ for formatting. Add the following changes to the `prettier` settings:

```
  "printWidth": 100,
  "singleQuote": true,
  "trailingComma": "all",
```

### Current state:

![screenshot](https://user-images.githubusercontent.com/12832034/40526428-44e37118-5f9b-11e8-8e63-c5fbaf9cae59.png 'screenshot')

