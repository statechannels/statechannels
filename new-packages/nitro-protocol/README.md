# State Machine Channels

This repo is a rough sketch of how to implement state channels using a state machine paradigm.

## Rough idea:

A `StateChannel` on assets `A` is
  * a set of states `S`
  * a transition function `t: S x S -> {true, false}`, which checks conditions for a transition to be valid
  * a resolution function `f: S -> Settlement(A)`, where `Settlement(A): address -> a` st `Sum_{addresses} settlement(address) = A` (i.e. a complete distribution of the assets in the channel to a set of addresses)

A `run` of a state channel is a set of states `R = (s1, s2, ...)` that the channel moved through. It should be true that all the transitions in a run are valid e.g. `t(s_i, s_{i+1}) == true` for all `s_i in R`.

You can visualise a state channel as a graph. For example, this is a state channel for timed secret exchange:

![tse](./docs/timed_secret_exchange.png)


## Development

Commands:

* Compile contracts: `truffle compile`
* Migrate contracts: `truffle migrate`
* Test contracts: `truffle test`

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
