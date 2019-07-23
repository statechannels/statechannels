---
id: commitment-format
title: Commitment Format
sidebar_label: Commitment Format
---

A specified format of commitments is vital, since it constitutes much of the interface between the on- and off- chain behaviour of the state channel network.

In Nitro, the following fields must be included in commitments:

| **Field**      | **Data type**                 | **Definition / Explanation**                                                                         |
| :------------- | :---------------------------- | :--------------------------------------------------------------------------------------------------- |
| ChainID        | `bytes32`                     | e.g. ropsten / mainnet                                                                               |
| Participants   | `address[]`                   | address of participants in priority order                                                            |
| ChannelNonce   | `uint256`                     | unique, to prevent replay attacks                                                                    |
| TurnNum        | `uint256`                     | turn number                                                                                          |
| DefaultOutcome | `[address, uint256][]`        | tracks the amounts paid out to each of a list of addresses if the channel is finalized in this state |
| isFinal        | `boolean`                     |                                                                                                      |
| AppDefinition  | `address`                     | on-chain address of library defining custom application rules                                        |
| AppData        | `bytes`                       | application-specific data                                                                            |
| Signature      | `[uint256, bytes32, bytes32]` | ECDSA signature of commitment \(v, r, s\)                                                            |

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

## Channel address

The address of a channel is the hash of `Participants, AppDefinition` and `ChannelNonce:`

In `force-move-protocol/packages/fmg-core/contracts/Commitment.sol`:

```solidity
channelId = keccak256(abi.encodePacked(_commitment.channelType, _commitment.nonce, _commitment.participants));
```

Since it takes the same format as a participant address, a channel address, may be allocated funds by another channel. However, a private key for a channel address is not known to anyone. This means that funds cannot be drawn directly from channel addresses. By choosing a new `ChannelNonce` each time the same participants execute the same application, they can avoid replay attacks.

## Turn taker / mover

Let `n = Participants.length`. Then:

```javascript
mover = participants[turnNum % n];
```
