---
id: state-format
title: State Format
---

A specified format of _state_ is vital, since it constitutes much of the interface between the on- and off- chain behavior of the state channel network.

In ForceMove, the following fields must be included in state updates:

| **Field**         | **Data type** | **Definition / Explanation**                                  |
| :---------------- | :------------ | :------------------------------------------------------------ |
| chainId           | `uint256`     | e.g. 3 (ropsten) or 1 (mainnet)                               |
| participants      | `address[]`   | participant addresses                                         |
| channelNonce      | `uint256`     | chosen by participants to make ChannelId unique               |
| challengeDuration | `uint256`     | duration of challenge (in seconds)                            |
| turnNum           | `uint256`     | turn number                                                   |
| outcome           | `bytes`       | the _outcome_ if the channel were to finalize in this state   |
| isFinal           | `boolean`     | is this state final?                                          |
| appDefinition     | `address`     | on-chain address of library defining custom application rules |
| appData           | `bytes`       | application-specific data                                     |

Since updates must ultimately be interpreted by smart contracts, the encoding of these fields must be carefully considered. The following encoding is designed around optimal gas consumption:

```solidity
    struct State {
        // participants sign the hash of this
        uint256 turnNum;
        bool isFinal;
        bytes32 channelId; // keccack256(abi.encode(chainId, participants, channelNonce))
        bytes32 appPartHash;
        //     keccak256(abi.encode(
        //         fixedPart.challengeDuration,
        //         fixedPart.appDefinition,
        //         variablePart.appData
        //     )
        // )
        bytes32 outcomeHash; //  keccak256(abi.encode(outcome))
    }
```

## ChannelId

The address of a channel is the hash of the abi encoded `chainId`, `participants` and `channelNonce`.

By choosing a new `channelNonce` each time the same participants execute a state channel supported by the same chain, they can avoid replay attacks.

---

## Fixed and Variable Parts

It is convenient to define some other structs, each containing a subset of the above data:

```solidity
  struct FixedPart {
        uint256 chainId;
        address[] participants;
        uint256 channelNonce;
        address appDefinition;
        uint256 challengeDuration;
    }
```

which contains information which must be identical in every state channel update, and

```solidity
   struct VariablePart {
        bytes outcome;
        bytes appData;
    }
```

which contains fields which are allowed to change. These structs, along with remaining fields, `turnNum` and `isFinal`, can be passed in to contract methods for more gas efficient execution.

## Implementation FAQs

**Why include the ChannelId separately?** We have to calculate the `channelId` for every single operation anyway. Given that we have it it's cheaper to hash in the hash, rather than the individual components again.

**Why not include the `AppDefinition` in the `ChannelId`?** The `AppDefinition` is fixed as part of the transition rules, so it seems like it would make sense to include it in the `ChannelId`. However, this would rule out participants being able to collaboratively upgrade the app without refunding the channel.

**Why not hash the `AppDefinition` together with the `ChannelId` into a `FixedPartHash`?** By doing this you perform one extra hash but you have to hash less data in the variable part. This tradeoff makes sense if you're hashing something like >3 variable parts for the same fixed part (based on the relative gas costs). We anticipate that most of the time channels will have 2 participants, so we optimize for this case.

**Why not include `TurnNum` or `isFinal` in the `VariablePartHash`?** Having the `turnNum` and `isFinal` separate makes the `conclude` method more efficient, as it can pass in just the `VariablePartHash` and not the (potentially large) data within it.

**What happened to the "commitment" terminology?**
This has been deprecated in favor of "state".
