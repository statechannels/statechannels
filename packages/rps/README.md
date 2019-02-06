<h1 align="center">
<div><img src="./orange_fireball.svg"> </div>
Magmo Apps
</h1>
Welcome to the Magmo mono-repo, home of several proof-of-concept applications built on our state channel protocols.

## For more information
On our [website](https://magmo.com) you will find links to our whitepapers and contact information. Whether you simply want to try
out our apps, or get involved more deeply we would love to hear your thoughts. Deployed versions of our games may be accessed with these links:

* [Rock Paper Scissors](https://rps.magmo.com) (RPS)
* [Tic Tac Toe](https://ttt.magmo.com) (TTT)

## Setting up development environment and running a game application
You will need `yarn` installed (see [here](https://yarnpkg.com/lang/en/docs/install/) for instructions). After cloning the code, 
1. In the top directory, run `yarn install`.
2. Run `npx lerna bootstrap`.
3. Add `.env` files to the root directory of the `wallet` package, and to the root directory of the relevant app directory. Refer to `.env.example` which includes an example of the required variables.

4. Start [ganache](https://truffleframework.com/ganache) by running `yarn ganache:start` .
5. (In a new shell) Run the wallet via `yarn start` in the `wallet` package directory
6. (In a new shell) Run a game (either RPS or TTT) via `yarn start` in the relevant package directory.
7. Add [MetaMask](https://metamask.io/) to your browser, and point it to `localhost:3001` to view the application. You will need to import one of our (testnet-only) seed accounts into metamask to have funds to transact.
    1. Open the metamask browser extension
    2. Click on the account icon (circle in the top right)
    3. Select "Import"
    4. Paste in one of [these secret keys](https://github.com/magmo/devtools/blob/master/utils/startGanache.js).

You may visit the app in two different browsers in order to play against yourself. We use [Redux DevTools](https://github.com/reduxjs/redux-devtools) to develop and test our apps.

#### To run storybook

We use [Storybook](https://storybook.js.org/) to view our react components during development. You can start Storybook by running:
```
yarn storybook
```
in the relevant package directory. This will fire up the Storybook panel inside a browser.


#### To create an optimized production build:

1. Update your `TARGET_NETWORK` in all relevant `.env` files to a named network from `truffle.js` (default is `ropsten`)
2. Build the application:

    ```
    yarn run build
    ```

#### To deploy smart contracts

1. Add test eth to your account for the deployment using an eth faucet: https://faucet.ropsten.be/ or https://faucet.metamask.io.
2. Set `TARGET_NETWORK` in your `.env` file to the network you want to deploy to: either `'development'`, `'ropsten'`, `'kovan'` or `'rinkeby'`.
3. Deploy the contracts to the network:
    ```
    yarn deployContracts
    ``` 
Alternatively, simply run, e.g. `TARGET_NETWORK=ropsten yarn deployContracts`.

#### Running Tests specific to a certain app
From the relevant subdirectory...
* To run application tests in watch mode:

```
yarn test:app
```

* To run smart contract tests:

```
yarn test:contracts
```

* To run all tests relating (before submitting a PR):

```
yarn test
```

* To update dependencies:

```
npx lerna bootstrap
```

* To add a dependency:

```
npx lerna add [dependency name] --scope=[target package]
```

 This installs the latest version of the dependency to the target package (ttt, rps or wallet). Use `--dev` flag to add the new package to `devDependencies` instead of `dependencies`.

* To update the version of a dependency:

```
yarn upgrade [package-name@version-number]
```

#### Project style

Please use the Sublime/VS Code package _JsPrettier_ for formatting. Add the following changes to the `prettier` settings:

```
  "printWidth": 100,
  "singleQuote": true,
  "trailingComma": "all",
```
## Documentation
We are working hard to produce documenation for our applications. In the interim, please see our [Developer Handbook](https://magmo.gitbook.io/developer-handbook/), which as some of the hints and tips
for developing on ethereum that we have used to develop our apps. You will also find some information in the `/notes/` subdirectory of each app. 

## Problems?
Frequently, problems can be sorted by one or more of the following steps:
- Resetting your MetaMask account (i.e. deleting transaction history), or simply switching to a different network and back again.
- Restarting ganache 
- Running `npx lerna bootstrap` if you changed any dependencies


Otherwise, please check [issues](https://github.com/magmo/rps/issues), someone else may have had the same experience. You may find a solution -- if not, please add to or create an issue.



