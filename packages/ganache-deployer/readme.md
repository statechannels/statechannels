# 📤 Ganache deployer

This package manages and tracks the deployment of contracts from other packages.

- It exports a `startGanacheAndDeploy` function. This is useful if you want to start ganache in a start script (see [`wallet/scripts/start.js`](../wallet/scripts/start.js)
- It allows for other packages to be built when ganache is not running. In the future we can use this to store test-net deployment info.
- When `ganache-deployer` starts up ganache, it copies the existing `ganache-network-context.json` to `ganache-network-context.json.bak` and generates a new file containing the ganache deployment info.
- `ganache-deployer` has a `start-ganache-and-deploy` binary that can be used to trigger the original start-script. So you can have a script entry like this in another package: `"start:ganache": "node_modules/.bin/start-ganache-and-deploy"`.

### NOTE:

Since we update the git tracked file `ganache-network.json` when running ganache it's going to show up as a modified file in git. Once ganache is stopped the file will be reverted to the original file.
