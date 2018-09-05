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
1. Run the server:
    ```
    yarn start
    ```
1. In your browser make sure you have the local ganache network (probably `localhost:7546`) selected in metamask

#### To build:

`yarn run build`

#### To develop smart contracts

```
# compile project with tsc, and run `truffle compile` from within build/dist
yarn truffle:compile

# deploy smart contracts to a network
TRUFFLE_NETWORK=<named network in truffle.ts> yarn truffle:migrate
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

