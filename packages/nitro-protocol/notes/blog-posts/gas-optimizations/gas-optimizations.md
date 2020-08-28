# State Channels gas consumption cut by 4x

As part of a recent overhaul of the contract layer of the state channels stack, we have achieved a significant reduction in costs for end users of our general scaling solution for the Ethereum blockchain.

## Why care about gas?

Ethereum runs on transactions, submitted by end users and causing changes of state in the Ethereum virtual machine (EVM) "world computer". Gas is the unit of an internal currency used to meter the computational cost of processing those transactions. It must be paid for at an exchange rate ("gas cost") set by the user (and tunable for speed / cost tradeoff). Right now a typical gas cost is around [2 GWei](https://ethgasstation.info/). At [recent exchange rates](https://pro.coinbase.com/trade/ETH-USD), this implies about 0.30 USD for 1M gas. The fee for a transaction is the product of the gas cost and the amount of gas consumed: this fee is an incentive for Ethereum miners to try and get the transaction included in the blockchain, since once it is 'confirmed' they are paid the fee. The fee is a pain point for DApp users -- less so if the DApp is converted to use a state channel.

Because the Ethereum virtual machine is replicated on a large number ( > 7000 at the time of writing) of [Ethereum nodes](https://www.ethernodes.org/), loosely speaking the transaction fees are symptomatic of having this large number of nodes compute and validate state transitions that may or may not be of interest to them. State channels exploit this fact to reduce the need for all of those state transitions to be validated, and therefore reduce the transaction fees that need to be paid. Since Ethereum currently runs on a Proof of Work protocol, the use of state channels can also reduce the amount of unnecessary electricity consumed by the network as a whole.

## State channels reduce gas by eliminating transactions

State channels are a method of discarding as many transactions as possible, and replacing them with messages shared only between a fixed set of participants. A regular DApp would submit every state update as an Ethereum transaction, incurring the gas costs and significant latency of at least one or more block confirmation periods (about [15 seconds](https://etherscan.io/chart/blocktime)) for each one. A state channel app (SCApp) ideally only submits two Ethereum transactions, which bring about a state transition representing the _net_ change in state agreed upon by the state channel participants via their messages. In the event of a _disagreement_, more transactions may be used to cause the chain to settle the dispute.

Many companies today use their own, private accounting system to reduce the need for payments to be processed by a public network: for example, consider store gift-cards, cellphone contracts or utility companies. Individual "payments" in the private system are typically quite small, are _not_ of interest to outside parties, and are essentially IOUs signed by the participant, submitted to the company, and backed by an initial deposit. State channels operate in much the same way, only the initial funds are not in the sole custody of any one party, but held in [escrow](https://en.wikipedia.org/wiki/Escrow) by the blockchain.

If starting from scratch, state channels require at least one transaction to set up (e.g. to escrow some ETH), and one transaction to tear down (e.g. to payout the ETH), with all other state updates (e.g. transferring a portion of that ETH between the participants) being off-chain and therefore fast and free.

## Residual gas costs for state channels

With our state channel network protocol [Nitro](https://magmo.com/nitro-protocol.pdf), the situation is much improved: users will likely only ever need to setup a _single_ channel known as a "hub connection", and administer it periodically (say once a month). A hub connection can be bootstrapped to _virtually_ setup and teardown state channels without any Ethereuym transactions. This means that the setup and teardown costs of that single hub connection channel are less critical. They remain a pain point for end users, however, and therefore a barrier to mainstream adoption for Ethereum: the costs need to be reduced as much as possible.

Additionally, settling state channel _disputes_ on chain will always involve Ethereum transactions, even if in an ideal (and hopefully also in a typical) world they are never used. The _possibility_ of having disputes settled lends strong guarantees about fair extraction of any escrowed assets, however: the gas consumed during settlement therefore remains an important consideration. If the associated costs were prohibitive, or if they outweighed the assets staked in the channel, it might mean that challenges would never be used and the security guarantees would be effectively void.

Residual gas consumption in state channels is influenced by a number of factors other than the underlying protocol: including for example the [EVM version](https://solidity.readthedocs.io/en/latest/using-the-compiler.html#target-options) (e.g. Constantinople vs Istanbul), and the solidity compiler; but most of all it is influenced by the design of the smart contracts that implement the state channel adjudication and asset holding protocols: influenced, that is, by the efficiency by which those contracts compute the necessary state transitions. Efficiency in this context is determined by the [Ethereum gas fee schedule](https://github.com/Ethereum/yellowpaper).

Deploying the contracts to chain also consumes gas: typically a large amount since they involve storing an amount of bytecode roughly proportional to the "size" of the contract source code.

Over the past 18 months, our contracts have been evolving towards a much more gas efficient implementation.

In the early days of state channels, there was the _Simple Adjudicator_ contract, which escrowed ETH and settled disputes for a single state channel only. As such, a new deployed instance was required for each state channel. This is very inefficient from a gas point of view, since the same code is stored on chain over and over.

The Simple Adjudicator was replaced by the the first (legacy) incarnation of the _Nitro Adjudicator_, which stored sufficient data on chain for managing an unlimited number of channels, including virtual channels. This was a great improvement, since deployment costs were now only borne once and probably not by the end user. The residual gas costs (i.e. for the disputes and for managing a hub connection) were still substantial, however, and equivalent to dozens of regular Ethereum transactions (each costing a minimum if 21000 = 21K gas).

The major costs in the legacy contracts were incurred due to storing a relatively large amount of data for each channel: data that specifies the assets escrowed, where they should be paid out when the channel resolves, and sufficient information to resolve a dispute. Writing to and reading from storage incur 20K and 15K gas per 32 bytes (respectively), dwarfing other costs associated with computations that remain in memory.

## Hashed storage FTW!

The main trick to reducing residual gas consumption is to reduce all storage to a minimum: a single `bytes32` storage slot. But how to do this, when the outcome data is application specific and surely longer than 32 bytes?

The answer lies in the magic of cryptographic hash functions, which are a core primitive of blockchains. Cryptographic hash functions accept variable length input, are infeasible to invert, and produce fixed length output. By storing only the `keccak256` **hash** of the outcome data, we ensure that only one slot gets used, regardless of the application. Previously, the number of slots required would grow with the complexity of the application data.

![Optimization](/optimization.svg)

Caption: "Minimizing on chain storage" 1. Originally, a new instance of the SimpleAdjudicator contract was needed for each state channel. 2. The legacy Nitro Adjudicator contract only needs to be deployed once and can support many state channels, albeit at a cost that depends on the complexity of the state channel. 3. The optimized Nitro Adjudicator contract stores the necessary data for each channel in a fixed-length hash, which reduces gas consumption considerably.

The only remaining puzzle is to get around the infeasibility of inverting the hash function to rehydrate the outcome data -- there is no point in storing the hashed data if the EVM is unable to properly interpret it and act accordingly (e.g. paying out prize winnings). The answer is for all the public methods (which are targeted via Ethereum transactions) to accept the hydrated data as input. This input is then rehashed and checked against storage before any further execution is allowed: and the hydrated data supplied in the `CALLDATA` can be used in any necessary computations. So the effect is the same as having the hydrated data in storage, only with a lower cost.

The tradeoffs are some extra information in the `CALLDATA`, and the burden of tracking the data off-chain in each participants state channel wallet. But this is very much in the spirit of performing as much of the computation off chain as possible. Having every node of the Ethereum main chain store all of this data is wasteful and costly: only interested parties need to store it.

## Results

It is important to remember that we are building the infrastructure for _generalized_ state channels -- meaning that SCApp developers can plug their own "rules" into our stack to rapidly develop their application without having to worry about funding and dispute resolution more than they need to. The gas costs will therefore remain dependent on the situation: How many participants are there in the channel? Does this transition confirm to the application specific rules? To get an idea of the overall savings, we concentrate on three main metrics. These are: (1) the 'Happy Path' (setup plus teardown costs: depositing and then concluding and withdrawing funds) and (2) the 'Challenge Path' (raising a dispute plus responding to it). Further, we tested these paths using an almost-trivial state channel application so that the situation-dependent costs are about as small as they could be -- meaning that the reported numbers are to be considered "best case" or lower bounds on typical gas consumption numbers. The figure reveals the savings that we have made:

![Gas Savings](/gas-savings.svg)

As you can see, we have achieved a more than 4x improvement in the Happy Path and the Challenge Path that users may tread. As a bonus, the deployment costs are also significantly reduced (~6.5M down to ~4.9M) due to some refactoring and tweaks performed in tandem with the optimization strategy.

Furthermore, we have also upgraded our contracts to allow for a channel to be backed by a combination of ETH and any number of ERC20 tokens. The opportunities that this opens up will be discussed in a future blog post.

For more information about how our contracts work, and to explore the source code, visit https://protocol.statechannels.org/. Otherwise feel free to check out our [research forum](https://research.statechannels.org/), or reach out on [twitter](https://twitter.com/statechannels).
