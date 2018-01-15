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
