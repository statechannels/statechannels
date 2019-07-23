---
id: auxiliary-protocols
title: Auxiliary Protocols
sidebar_label: Auxiliary Protocols
---

In this section we provide procedures for various tasks that use Nitro and are value preserving for all participants: that is to say, a series of state channel network configurations connected by Nitro operations that preserves the extractable assets for each participant.

**Directly funding a channel**  
Participants deposit in their order of precedence as listed in the channel itself. Depositing ahead of those with higher precedence is not safe \(they can steal your funds\). Always ensure that the channel is funded up to an including all players with higher precedence, before making a deposit.

**Indirectly funding a channel**  
For example, funding an application channel \(such as a payment or game\) from a ledger channel

- Prepare the application channel by exchanging pre fund commitments.
- Run the consensus game in the ledger channel to update it to a finalizable outcome which allocates funds to the application channel and reduces the total funds allocated to participants accordingly.

**Topping-up**  
Assume C wishes to increase their balance in a funded channel by x

- Run the consensus game to update the outcome of the channel such that C has lowest priority but has x more coins than before
- The channel is currently underfunded \(hence value preservation\)
- C deposits x into the channel, it becomes funded.

**Partial withdrawal**  
Assume C wishes to decrease their balance in a funded channel L by x

- Prepare a new channel L' with the desired new outcomes \(the same as L but with C allocated x less\)
- Run the consensus game in L to update its outcome such that C is allocated x, and L' is allocated x less than L.
- C transfers and withdraws from L now or at their leisure
- Application continues in L'.

**Offloading an indirectly funded channel**  
For example, we wish to take a game of Rock Paper Scissors and make it directly funded, rather than indirectly via a ledger channel

- call transfer\(ledger_channel, application_channel, indirect_funding_of_application_channel\)

**Closing off-chain**

- Finalize via cooperative channel closing \(see above\) but instead of submitting the proof to the on chain adjudicator:
  - Update the parent ledger channel to defund the application channel and to increase the funds allocated to the participants accordingly
  - Discard application channel

**Virtually funding a channel between two parties**  
Begin with a pair of directly funded ledger channels, with respective participants \[A,I\] and \[B,I\].

- Prepare a channel V with participants \[A,B\] with allocations for each no larger than the minimum allocation in each of the ledger channels.
- Prepare a three party joint channel J, with I's allocation \(the ‘colateral’\) sufficient to fund V.
- Prepare a pair of guarantor channels BIA and AIB, each guaranteeing / reprioritising J's outcome in a different order.
- Indirectly fund BIA from the \[A,I\] channel and AIB from the \[B,I\] channel, in any order.
- Run the consensus game in the joint channel J, to update its outcome to fund the virtual channel V and the intermediary I.
