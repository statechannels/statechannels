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
| participants            | Participant[]    | Identifying information members of channel |
| allocations             | Allocation[]      | Array of funding amounts for participants  |
| appData                 | string            | Encoded initial state of app               |
| appDefinition           | string            | Address of contract governing the channel  |
| channelId               | string            | Unique channel identifier                  |
| status                  | ChannelStatus     | Current status of channel                  |
| turnNum                 | number            | Channel nonce                              |
| challengeExpirationTime | number (optional) | Time current challenge on channel elapses  |

### Errors

| Code | Message                | Description                           |
| ---- | ---------------------- | ------------------------------------- |
| 1000 | SigningAddressNotFound | Unable to find expected ephemeral key |
| 1001 | InvalidAppDefinition   | App definition not valid address      |
| 1002 | UnsupportedToken       | Token in allocations not supported    |

TODO: (HIGH) Verify these are all of the expected errors (what if request times out? what if some participant refuses to join the channel?)

### Example

```typescript
// TODO: (LOW) Best way to display JSON RPC examples
```

## ApproveBudgetAndFund

TODO: (HIGH) Better description

Requests approval for a new budget for a given channel participant from the channel counterparties, as well as an associated ledger channel.

### Parameters

| Name                     | Type        | Description                                         |
| ------------------------ | ----------- | --------------------------------------------------- |
| hub                      | Participant | Identifying information for intermediary in channel |
| playerParticipantId      | string      | Unique identifier of player                         |
| token                    | string      | Address of asset for channel funding                |
| requestedSendCapacity    | string      | Max amount sendable in channel                      |
| requestedReceiveCapacity | string      | Max amount receivable in channel                    |

### Response

| Name       | Type          | Description                                                            |
| ---------- | ------------- | ---------------------------------------------------------------------- |
| domain     | string        | The channel the funds are attributed to                                |
| hubAddress | string        | Signing address of channel intermediary                                |
| budgets    | TokenBudget[] | An array of approved send and received capacity for a list of channels |

### Errors

TODO: (HIGH) Define errors in typescript

### Example

```typescript
// TODO: (LOW) Best way to display JSON RPC examples
```

## UpdateChannel

TODO: (HIGH) Description

### Parameters

| Name        | Type         | Description                        |
| ----------- | ------------ | ---------------------------------- |
| channelId   | Byttes32     | Derived channel identifier         |
| allocations | Allocation[] | Updated token balances for channel |
| appData     | string       | Encoded updated application state  |

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

### Errors

| Code | Message            | Description                                 |
| ---- | ------------------ | ------------------------------------------- |
| 400  | Channel not found  | Could not find channel to update in storage |
| 401  | Invalid transition | Illegal state transition proposed           |
| 402  | Invalid app data   | Incorrect encoded app information           |
| 403  | Not your turn      | Cannot update channel                       |
| 404  | Channel closed     | Channel no longer accepting updates         |

### Example

```typescript
// TODO: (LOW) Best way to display JSON RPC examples
```

## JoinChannel

TODO: (HIGH) Description

### Parameters

| Name      | Type    | Description               |
| --------- | ------- | ------------------------- |
| channelId | Bytes32 | Unique channel identifier |

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

### Errors

| Code | Message            | Description                                 |
| ---- | ------------------ | ------------------------------------------- |
| 1100 | Channel not found  | Could not find channel to update in storage |
| 1101 | Invalid transition | Channel cannot be joined                    |

### Example

```typescript
// TODO: (LOW) Best way to display JSON RPC examples
```

## CloseAndWithdraw

TODO: (HIGH) Description

### Parameters

| Name             | Type   | Description                               |
| ---------------- | ------ | ----------------------------------------- |
| hubParticipantId | string | Participant identifier for ledger channel |

### Response

| Name    | Type    | Description                                      |
| ------- | ------- | ------------------------------------------------ |
| success | boolean | Whether channel withdrawal and closing succeeded |

### Errors

| Code | Message       | Description                                  |
| ---- | ------------- | -------------------------------------------- |
| 200  | User declined | Counterparty did not approve channel closure |

### Example

```typescript
// TODO: (LOW) Best way to display JSON RPC examples
```

## CloseChannel

TODO: (HIGH) Description

### Parameters

| Name      | Type    | Description               |
| --------- | ------- | ------------------------- |
| channelId | Bytes32 | Unique channel identifier |

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

### Errors

| Code | Message           | Description                                   |
| ---- | ----------------- | --------------------------------------------- |
| 300  | Not your turn     | Not your turn to update channel, cannot close |
| 301  | Channel not found | Could not find channel to update in storage   |

### Example

```typescript
// TODO: (LOW) Best way to display JSON RPC examples
```

## ChallengeChannel

TODO: (HIGH) Description

### Parameters

| Name      | Type    | Description               |
| --------- | ------- | ------------------------- |
| channelId | Bytes32 | Unique channel identifier |

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

### Errors

| Code | Message           | Description                                    |
| ---- | ----------------- | ---------------------------------------------- |
| 1300 | Channel not found | Could not find channel to challenge in storage |

### Example

```typescript
// TODO: (LOW) Best way to display JSON RPC examples
```

## GetBudget

TODO: (HIGH) Description

### Parameters

| Name             | Type   | Description                               |
| ---------------- | ------ | ----------------------------------------- |
| hubParticipantId | string | Participant identifier for ledger channel |

### Response

If the budget cannot be found, this method will return an empty object. Otherwise, it returns a `DomainBudget`:

| Name       | Type          | Description                                                            |
| ---------- | ------------- | ---------------------------------------------------------------------- |
| domain     | string        | The channel the funds are attributed to                                |
| hubAddress | string        | Signing address of channel intermediary                                |
| budgets    | TokenBudget[] | An array of approved send and received capacity for a list of channels |

### Errors

TODO: (HIGH) Define errors

### Example

```typescript
// TODO: (LOW) Best way to display JSON RPC examples
```

## GetChannels

TODO: (HIGH) Description

### Parameters

| Name          | Type               | Description                                         |
| ------------- | ------------------ | --------------------------------------------------- |
| includeClosed | boolean (optional) | Whether closed/inactive channels should be included |

### Response

Returns an array of `ChannelResult` objects:

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

### Errors

TODO: (HIGH) Define errors

### Example

```typescript
// TODO: (LOW) Best way to display JSON RPC examples
```

## GetState

TODO: (HIGH) Description

### Parameters

| Name      | Type    | Description               |
| --------- | ------- | ------------------------- |
| channelId | Bytes32 | Unique channel identifier |

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

### Errors

| Code | Message           | Description                       |
| ---- | ----------------- | --------------------------------- |
| 1200 | Channel not found | Could not find channel in storage |

### Example

```typescript
// TODO: (LOW) Best way to display JSON RPC examples
```

## GetWalletInformation

TODO: (HIGH) Description

- Is this a wallet wallet or a channel wallet? Definitely needs a more descriptive name than wallet.
- How does this wallet relate to the ephemeral keys?

### Parameters

Accepts an empty object as the JSON RPC Request parameters.

### Response

| Name               | Type                | Description                           |
| ------------------ | ------------------- | ------------------------------------- |
| signingAddress     | string              | Eth address used to sign from wallet  |
| destinationAddress | string \| undefined | Where funds should go after a dispute |
| walletVersion      | string              | Wallet version number                 |

### Errors

TODO: (HIGH) Define errors

### Example

```typescript
// TODO: (LOW) Best way to display JSON RPC examples
```

## EnableEthereum

TODO: (HIGH) Description

- Name seems to specific, this should be more generic if channels can be chain agnostic
- How does this relate to the wallet, is this essentially the `connect(...)` method on an ethers `Signer`?

### Parameters

Accepts an empty object as the JSON RPC Request parameters.

### Response

| Name               | Type                | Description                           |
| ------------------ | ------------------- | ------------------------------------- |
| signingAddress     | string              | Eth address used to sign from wallet  |
| destinationAddress | string \| undefined | Where funds should go after a dispute |
| walletVersion      | string              | Wallet version number                 |

### Errors

| Code | Message              | Description                       |
| ---- | -------------------- | --------------------------------- |
| 100  | Ethereum not enabled | Could not connect to eth provider |

### Example

```typescript
// TODO: (LOW) Best way to display JSON RPC examples
```

## PushMessage

TODO: (HIGH) Description

### Parameters

| Name      | Type    | Description            |
| --------- | ------- | ---------------------- |
| recipient | string  | Recipient identifier   |
| sender    | string  | Sender identifier      |
| data      | unknown | Arbitrary message data |

### Response

| Name    | Type    | Description                                    |
| ------- | ------- | ---------------------------------------------- |
| success | boolean | Whether the message was successfully delivered |

### Errors

| Code | Message           | Description                     |
| ---- | ----------------- | ------------------------------- |
| 900  | Wrong participant | Not your turn to update channel |

### Example

```typescript
// TODO: (LOW) Best way to display JSON RPC examples
```
