# Force-Move Games

An MVP Force-Move Games implementation. **Not production ready.**

## Install
### Test Node
1. Download and install [ganache](http://truffleframework.com/ganache/)

### Force Move Framework
1. $ git clone git@github.com:magmo/minimal-viable-force-move-games.git
2. $ cd minimal-viable-force-move-games
3. $ npm install
4. $ truffle test test/SimpleAdjudicator.js

## Development

Commands:

* Compile contracts: `truffle compile`
* Migrate contracts: `truffle migrate`
* Test contracts: `truffle test`

In order to run the tests locally, you need to have a test ethereum node running. The easiest way to do this is to download and install [ganache](http://truffleframework.com/ganache/).

## Gas Usage

To calculate gas usage:
1. Uncomment the line `// reporter: 'eth-gas-reporter'` in `truffle.js`
2. Run the simple adjudicator tests: `truffle test test/SimpleAdjudicator.js`

Note: running the gas reporter massively slows down the tests.

Example output:
```
·-------------------------------------------------------------------------------------|----------------------------·
│                                         Gas                                         ·  Block limit: 6721975 gas  │
·····················································|································|·····························
│  Methods                                           ·           2 gwei/gas           ·       547.09 usd/eth       │
······················|······························|··········|··········|··········|·············|···············
│  Contract           ·  Method                      ·  Min     ·  Max     ·  Avg     ·  # calls    ·  usd (avg)   │
······················|······························|··········|··········|··········|·············|···············
│  SimpleAdjudicator  ·  forceMove                   ·  234248  ·  399248  ·  275498  ·          4  ·        0.30  │
······················|······························|··········|··········|··········|·············|···············
│  SimpleAdjudicator  ·  instantWithdrawal           ·       -  ·       -  ·       -  ·          0  ·           -  │
······················|······························|··········|··········|··········|·············|···············
│  SimpleAdjudicator  ·  refuteChallenge             ·       -  ·       -  ·   63160  ·          1  ·        0.07  │
······················|······························|··········|··········|··········|·············|···············
│  SimpleAdjudicator  ·  respondWithAlternativeMove  ·       -  ·       -  ·  134736  ·          1  ·        0.15  │
······················|······························|··········|··········|··········|·············|···············
│  SimpleAdjudicator  ·  respondWithMove             ·       -  ·       -  ·  105024  ·          1  ·        0.11  │
······················|······························|··········|··········|··········|·············|···············
│  SimpleAdjudicator  ·  withdrawFunds               ·       -  ·       -  ·   51507  ·          1  ·        0.06  │
·---------------------|------------------------------|----------|----------|----------|-------------|--------------·
```
