---
id: state-format
title: State Format
---

A specified format of state is vital, since it constitutes much of the interface between the on- and off- chain behaviour of the state channel network.

In ForceMove, the following fields must be included in state:

| **Field**         | **Data type** | **Definition / Explanation**                                  |
| :---------------- | :------------ | :------------------------------------------------------------ |
| ChainID           | `int256`      | e.g. ropsten / mainnet                                        |
| Participants      | `address[]`   | participant addresses                                         |
| ChannelNonce      | `uint256`     | chosen by participants to make ChannelId unique               |
| ChallengeDuration | `uint256`     | duration of challenge (in ms?)                                |
| TurnNum           | `uint256`     | turn number                                                   |
| CurrentOutcome    | `bytes`       | the _outcome_ if the channel were to finalize in this state   |
| isFinal           | `boolean`     |                                                               |
| AppDefinition     | `address`     | on-chain address of library defining custom application rules |
| AppData           | `bytes`       | application-specific data                                     |

Since commitments must ultimately be interpreted by smart contracts, the encoding of these fields must be carefully considered. One could use a custom encoding into, e.g. a concatenated byte string: instead one should use the experimental ABIEncoderV2, which means the commitment format above can be a struct. Currently it looks like this \(approximate equivalence to the above fields is shown in the comments\):

In `force-move-protocol/fmg-core/contracts/Commitment.sol`:

```solidity
struct CommitmentStruct {
    address channelType; // AppDefinition
    uint32 nonce; // ChannelNonce
    address[] participants;
    uint8 commitmentType; // isFinal
    uint32 turnNum;
    uint32 commitmentCount;
    address[] destination; // Outcomes[0,:]
    uint256[] allocation; // Outcomes[1,:]
    bytes appAttributes; // AppData
}
```

## ChannelId

The address of a channel is the hash of `Participants, AppDefinition` and `ChannelNonce:`

In `force-move-protocol/packages/fmg-core/contracts/Commitment.sol`:

```solidity
channelId = keccak256(abi.encodePacked(_commitment.channelType, _commitment.nonce, _commitment.participants));
```

Since it takes the same format as a participant address, a channel address, may be allocated funds by another channel. However, a private key for a channel address is not known to anyone. This means that funds cannot be drawn directly from channel addresses. By choosing a new `ChannelNonce` each time the same participants execute the same application, they can avoid replay attacks.

---

TODO: fixed parts vs non-fixed parts

## Implementation

The data that the participants sign should be the hash of the following:

- TurnNum
- isFinal
- ChannelId
  - ChainId
  - Participants
  - ChannelNonce
- AppPartHash
  - ChallengeDuration // only ever need this on a ForceMove
  - AppDefinition
  - AppData
- OutcomeHash

Where an item has nested children this implies that item is the hash of the children.

**Why include the ChannelId separately?** We have to calculate the `channelId` for every single operation anyway. Given that we have it it's cheaper to hash in the hash, rather than the individual components again.

**Why not include the `AppDefinition` in the `ChannelId`?** The `AppDefinition` is fixed as part of the transition rules, so it seems like it would make sense to include it in the `ChannelId`. This would rule out participants being able to collaboratively upgrade the app without refunding the channel through.

**Why not hash the `AppDefinition` together with the `ChannelId` into a `FixedPartHash`?** By doing this you perform one extra hash but you have to hash less data in the variable part. This tradeoff makes sense if you're hashing something like >3 variable parts for the same fixed part (based on the relative gas costs). We anticipate that most of the time channels will have 2 participants, so we optimize for this case.

**Why not include `TurnNum` or `isFinal` in the `VariablePartHash`?** Having the `turnNum` and `isFinal` separate makes the `conclude` and `refute` methods more efficient, as they can pass in just the `VariablePartHash` and not the (potentially large) data within it.
