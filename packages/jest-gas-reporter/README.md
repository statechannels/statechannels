# jest-gas-reporter

A simple jest reporter that reports the gas used by various calls to ethereum contracts.

It uses the `json` files compiled by truffle parse transactions that occured on `ganache` and show gas usage of different contract functions.

```
Test Suites: 1 passed, 1 total
Tests:       49 passed, 49 total
Snapshots:   0 total
Time:        58.388s

Gas Usage:
Contract Name         Method Name                 Calls  Min Gas  Max Gas  Average Gas
--------------------  --------------------------  -----  -------  -------  -----------
TestContract          deposit                     20     31032    46032    35532
TestContract          withdraw                    5      30800    74499    42586
```

## Configuration

Just add jest-gas-reporter to reporters in your jest config. By default `@statechannels/jest-gas-reporter` assume that contract json files are located in `./build/contracts`

```
 "reporters": ["default","@statechannels/jest-gas-reporter"]
```

If you want specify a folder where the contracts are located. `@statechannels/jest-gas-reporter` accepts a `contractArtifactFolder` option.

```js
"reporters": [
  "default",
  [
    "@statechannels/jest-gas-reporter",
    { "contractArtifactFolder":"output/contract" }
  ]
]
```
