---
id: json-rpc-api
title: JSON RPC Specification
sidebar_label: JSON RPC Specification
---

In this section we provide an overview of the JSON RPC schema for the Nitro protocol. All methods accept requests and return responses following the [JSON RPC 2.0 specification](https://www.jsonrpc.org/specification).

## CreateChannel

This method is used to create a state channel between a set of participants with given budgets. It contains information regarding the channel governance (via `appDefition`), type of channel, and initial state of that channel.

### Parameters

| Name            | Type                            | Description                                |
| --------------- | ------------------------------- | ------------------------------------------ |
| participants    | Participant[]                   | Identifying information members of channel |
| allocations     | Allocation[]                    | Array of funding amounts for participants  |
| appDefinition   | string                          | Address of contract governing the channel  |
| appData         | string                          | Encoded initial state of app               |
| fundingStrategy | 'Direct' \|'Ledger' \|'Virtual' | Funding method (type) of channel           |

### Response

| Name                    | Type              | Description                                |
| ----------------------- | ----------------- | ------------------------------------------ |
| participants            | Participants[]    | Identifying information members of channel |
| allocations             | Allocation[]      | Array of funding amounts for participants  |
| appData                 | string            | Encoded initial state of app               |
| appDefinition           | string            | Address of contract governing the channel  |
| channelId               | string            | Unique channel identifier                  |
| status                  | ChannelStatus     | Current status of channel                  |
| turnNum                 | number            | Channel nonce                              |
| challengeExpirationTime | number (optional) | Time current challenge on channel elapses  |

TODO: (MED) Questions:
- turnNum is set at Uint48, why?

### Errors

| Code | Message                | Description                           |
| ---- | ---------------------- | ------------------------------------- |
| 1000 | SigningAddressNotFound | Unable to find expected ephemeral key |
| 1001 | InvalidAppDefinition   | App definition not valid address      |
| 1002 | UnsupportedToken       | Token in allocations not supported    |

TODO: (HIGH) Verify these are all of the expected errors (what if request times out? what if some participant refuses to join the channel?)

### Example

```typescript
// TODO: Best way to display JSON RPC examples
```

## ApproveBudgeAndFund

### Parameters

| Name                     | Type        | Description                                         |
| ------------------------ | ----------- | --------------------------------------------------- |
| hub                      | Participant | Identifying information for intermediary in channel |
| playerParticipantId      | string      | Unique identifier of player                         |
| token                    | string      | Address of asset for channel funding                |
| requestedSendCapacity    | string      | Max amount sendable in channel                      |
| requestedReceiveCapacity | string      | Max amount receivable in channel                    |

### Response

### Errors

TODO: (HIGH) Define errors in typescript

### Example

## UpdateChannel

## JoinChannel

## CloseAndWithdraw

## CloseChannel

## ChallengeChannel

## GetBudget

## GetChannels

## GetState

## GetWalletInformation

## EnableEthereum

## PushMessage
