## Rock Paper Scissors: an example ForceMove game

This app is an example of a game built on our [ForceMove](https://magmo.com/force-move-games.pdf) protocol. You can play against a friend or against our bots on the ropsten testnet.

![splash](./screens.png 'screens')

To run the app on your machine, clone the code and follow the instructions below. 

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
1. Add a `.env` file to the root directory of the repo. Refer to `.env.example` which includes an example of the required variables.

### Development Info

#### To run a dev server:

1. Start ganache by running
    ```
    yarn ganache:start
    ```
2. **In a new tab** Run the server
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

#### To run storybook

We use [Storybook](https://storybook.js.org/) to view our react components during development. You can start Storybook by running:
```
yarn storybook
```
This will fire up the Storybook panel inside a browser.


#### To build:

1. Update your  `TARGET_NETWORK` in `.env` to a named network from `truffle.js` (default is `ropsten`)
2. Build the application:
    ```
    yarn run build
    ```

#### To deploy smart contracts

1. Add test eth to your account for the deployment using an eth faucet: https://faucet.ropsten.be/ or https://faucet.metamask.io.
2. Set `TARGET_NETWORK` in your `.env` file to the network  you want to deploy to.
3. Deploy the contracts to the network:
    ```
    yarn truffle:migrate
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

## Problems?

Please check [issues](https://github.com/magmo/rps-poc/issues), someone else may have had the same experience. You may find a solution -- if not, please add to or create an issue.

