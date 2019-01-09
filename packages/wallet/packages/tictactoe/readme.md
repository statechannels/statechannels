## Tic Tac Toe

This is the second game built game built on our [ForceMove](https://magmo.com/force-move-games.pdf) protocol. 

At the present time, there is no channel wallet in this project: the app includes smart contracts and will encode states appropriately, but nothing is currently deployed to the blockchain. You can play against a friend on a local network.

![splash](./screens.png 'screens')

To run the app on your machine, clone the code and follow the instructions below. 

### Setup

1. Add [MetaMask](https://metamask.io/) or an equivalent browser extension that injects a web3 object. 
1. Install yarn
    ```
    brew install yarn
    ```
2. Install dependencies
    ```
    yarn install
    ```

### Development Info

#### To run storybook

  We use [Storybook](https://storybook.js.org/) to view our react components during development. You can start Storybook by running:
 ```
 yarn storybook
 ```
 This will fire up the Storybook panel inside a browser.

 

#### To run a dev server:

1. Run the server
    ```
    yarn start
    ```
2. In your browser navigate to `localhost:3000`
3. Login to MetaMask (the network does not currently matter)


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


