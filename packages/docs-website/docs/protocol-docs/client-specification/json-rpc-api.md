---
id: json-rpc-api
title: JSON RPC Specification
sidebar_label: JSON RPC Specification
---

In this section we provide an overview of the JSON RPC schema for the Nitro protocol. All methods accept requests and return responses following the [JSON RPC 2.0 specification](https://www.jsonrpc.org/specification).

## CreateChannel

This method is used to create a channel between a set of participants with given budgets. It contains information regarding type of channel and initial state of that channel.

There are three different types of channels:

- _Direct Channel_: channels that support applications between ledger channel counterparties
- _Ledger Channel_: channels that manage the budgets and allocations between direct and virtual channels
- _Virtual Channel_: channels that support applications routed over ledger channels

In order to create a virtual or direct channel, you must have first created and funded a ledger channel between client and hub.

A `Participant` contains identifying information about channel members:

| Name           | Type      | Description                                              |
| -------------- | --------- | -------------------------------------------------------- |
| participantId  | string    | Unique identifier of channel participant                 |
| signingAddress | `Address` | Address used to sign channel state updates               |
| destination    | `Address` | Address to receive funds in case of disputes/withdrawals |

and an `Allocation` tracks information about the channel balance:

| Name            | Type               | Description                                              |
| --------------- | ------------------ | -------------------------------------------------------- |
| token           | `Address`          | Address of asset on chain                                |
| allocationItems | `AllocationItem[]` | Assigns some asset to a given user by address and amount |

### Parameters

| Name            | Type                            | Description                                |
| --------------- | ------------------------------- | ------------------------------------------ |
| participants    | `Participant[]`                 | Identifying information members of channel |
| allocations     | `Allocation[]`                  | Array of funding amounts for participants  |
| appDefinition   | Address                         | Address of contract governing the channel  |
| appData         | bytes                           | Encoded initial state of app               |
| fundingStrategy | `Direct` \|`Ledger` \|`Virtual` | Funding method (type) of channel           |

### Response

// TODO: (HIGH): What about the `SingleChannelResult` and `MultipleChannelResult` documented in the `server-wallet` package?

This method returns a `ChannelResult` as part of the JSON RPC Response, which is an object with the following fields:

| Name                    | Type              | Description                                |
| ----------------------- | ----------------- | ------------------------------------------ |
| participants            | `Participant[]`   | Identifying information members of channel |
| allocations             | `Allocation[]`    | Array of funding amounts for participants  |
| appData                 | string            | Encoded initial state of app               |
| appDefinition           | string            | Address of contract governing the channel  |
| channelId               | string            | Unique channel identifier                  |
| status                  | `ChannelStatus`   | Current status of channel                  |
| turnNum                 | number            | Channel nonce                              |
| challengeExpirationTime | number (optional) | Time current challenge on channel elapses  |

where the channel status can be one of:

TODO: (HIGH) Decided on finalized statuses. What is opening vs. proposed vs. funding vs. running? Is the channel thrown back into the `funding` state when it runs out of money?

- `proposed`: wallet has stored a channel, but no states are signed
- `opening`: channel has been joined, but is not properly funded
- `funding`: ???
- `running`: channel is ready to use
- `challenging`: channel is in an ongoing dispute
- `responding`: channel dispute is ongoing, and it is your turn to create a channel update (must send `UpdateChannel` request)
- `closing`: channel cannot be used, but funds are still locked
- `closed`: funds have been released from channel

Generally, the `ChannelResult` type is returned when an update to the channel state was made.

### Errors

| Code | Message                | Description                           |
| ---- | ---------------------- | ------------------------------------- |
| 1000 | SigningAddressNotFound | Unable to find expected ephemeral key |
| 1001 | InvalidAppDefinition   | App definition not valid address      |
| 1002 | UnsupportedToken       | Token in allocations not supported    |

TODO: (HIGH) Verify these are all of the expected errors (what if request times out? what if some participant refuses to join the channel?)

## UpdateChannel

Used to take a turn in your channel, or propose an update to a channel or application state. The application update must be a valid transition, and properly signed. The updated `ChannelResult` is returned.

### Parameters

| Name        | Type           | Description                        |
| ----------- | -------------- | ---------------------------------- |
| channelId   | `Byttes32`     | Derived channel identifier         |
| allocations | `Allocation[]` | Updated token balances for channel |
| appData     | string         | Encoded updated application state  |

### Response

| Name                    | Type              | Description                                |
| ----------------------- | ----------------- | ------------------------------------------ |
| participants            | `Participant[]`   | Identifying information members of channel |
| allocations             | `Allocation[]`    | Array of funding amounts for participants  |
| appData                 | string            | Encoded initial state of app               |
| appDefinition           | string            | Address of contract governing the channel  |
| channelId               | string            | Unique channel identifier                  |
| status                  | `ChannelStatus`   | Current status of channel                  |
| turnNum                 | number            | Channel nonce                              |
| challengeExpirationTime | number (optional) | Time current challenge on channel elapses  |

### Errors

TODO: (HIGH) Clean up error message types and codes

| Code | Message            | Description                                 |
| ---- | ------------------ | ------------------------------------------- |
| 400  | Channel not found  | Could not find channel to update in storage |
| 401  | Invalid transition | Illegal state transition proposed           |
| 402  | Invalid app data   | Incorrect encoded app information           |
| 403  | Not your turn      | Cannot update channel                       |
| 404  | Channel closed     | Channel no longer accepting updates         |

## JoinChannel

Called when you would are joining a channel that has been created. Generally, creating a channel is done, and a notification is sent to the desired counterparty, who then dispatches the `JoinChannel` request.

### Parameters

| Name      | Type      | Description               |
| --------- | --------- | ------------------------- |
| channelId | `Bytes32` | Unique channel identifier |

### Response

| Name                    | Type              | Description                                |
| ----------------------- | ----------------- | ------------------------------------------ |
| participants            | `Participant[]`   | Identifying information members of channel |
| allocations             | `Allocation[]`    | Array of funding amounts for participants  |
| appData                 | string            | Encoded initial state of app               |
| appDefinition           | string            | Address of contract governing the channel  |
| channelId               | string            | Unique channel identifier                  |
| status                  | `ChannelStatus`   | Current status of channel                  |
| turnNum                 | number            | Channel nonce                              |
| challengeExpirationTime | number (optional) | Time current challenge on channel elapses  |

### Errors

| Code | Message            | Description                                 |
| ---- | ------------------ | ------------------------------------------- |
| 1100 | Channel not found  | Could not find channel to update in storage |
| 1101 | Invalid transition | Channel cannot be joined                    |

## CloseChannel

TODO: (HIGH) Finalize API

This is the method used to propose a cooperative channel closure. Can be called on a channel that is properly `running`, and will begin the process of returning funds to the ledger channel for application or virtual channels, or to the `destination` defined for each `Participant`.

### Parameters

| Name      | Type    | Description               |
| --------- | ------- | ------------------------- |
| channelId | Bytes32 | Unique channel identifier |

### Response

| Name                    | Type              | Description                                |
| ----------------------- | ----------------- | ------------------------------------------ |
| participants            | `Participant[]`   | Identifying information members of channel |
| allocations             | `Allocation[]`    | Array of funding amounts for participants  |
| appData                 | string            | Encoded initial state of app               |
| appDefinition           | string            | Address of contract governing the channel  |
| channelId               | string            | Unique channel identifier                  |
| status                  | `ChannelStatus`   | Current status of channel                  |
| turnNum                 | number            | Channel nonce                              |
| challengeExpirationTime | number (optional) | Time current challenge on channel elapses  |

### Errors

| Code | Message           | Description                                   |
| ---- | ----------------- | --------------------------------------------- |
| 300  | Not your turn     | Not your turn to update channel, cannot close |
| 301  | Channel not found | Could not find channel to update in storage   |

## DefundChannel

TODO: (HIGH) Finalize API

## Withdraw

TODO: (HIGH) Finalize API

## ChallengeChannel

TODO: (MED) Is there a mechanism to "cancel" challenges?
Initiates an onchain challenge for a given channel. Will take the currently stored channel state, and put it onchain returning a `ChannelResult` object, and limiting the usage of the channel.

### Parameters

| Name      | Type    | Description               |
| --------- | ------- | ------------------------- |
| channelId | Bytes32 | Unique channel identifier |

### Response

| Name                    | Type              | Description                                |
| ----------------------- | ----------------- | ------------------------------------------ |
| participants            | `Participant[]`   | Identifying information members of channel |
| allocations             | `Allocation[]`    | Array of funding amounts for participants  |
| appData                 | string            | Encoded initial state of app               |
| appDefinition           | string            | Address of contract governing the channel  |
| channelId               | string            | Unique channel identifier                  |
| status                  | `ChannelStatus`   | Current status of channel                  |
| turnNum                 | number            | Channel nonce                              |
| challengeExpirationTime | number (optional) | Time current challenge on channel elapses  |

### Errors

| Code | Message           | Description                                    |
| ---- | ----------------- | ---------------------------------------------- |
| 1300 | Channel not found | Could not find channel to challenge in storage |

## GetChannels

Returns all channels associated with your wallet.

### Parameters

| Name          | Type               | Description                                         |
| ------------- | ------------------ | --------------------------------------------------- |
| includeClosed | boolean (optional) | Whether closed/inactive channels should be included |

### Response

Returns an array of `ChannelResult` objects:

| Name                    | Type              | Description                                |
| ----------------------- | ----------------- | ------------------------------------------ |
| participants            | `Participant[]`   | Identifying information members of channel |
| allocations             | `Allocation[]`    | Array of funding amounts for participants  |
| appData                 | string            | Encoded initial state of app               |
| appDefinition           | string            | Address of contract governing the channel  |
| channelId               | string            | Unique channel identifier                  |
| status                  | `ChannelStatus`   | Current status of channel                  |
| turnNum                 | number            | Channel nonce                              |
| challengeExpirationTime | number (optional) | Time current challenge on channel elapses  |

### Errors

TODO: (HIGH) Define errors

## GetState

Returns the current state of a given channel.

### Parameters

| Name      | Type    | Description               |
| --------- | ------- | ------------------------- |
| channelId | Bytes32 | Unique channel identifier |

### Response

| Name                    | Type              | Description                                |
| ----------------------- | ----------------- | ------------------------------------------ |
| participants            | `Participant[]`   | Identifying information members of channel |
| allocations             | `Allocation[]`    | Array of funding amounts for participants  |
| appData                 | string            | Encoded initial state of app               |
| appDefinition           | string            | Address of contract governing the channel  |
| channelId               | string            | Unique channel identifier                  |
| status                  | `ChannelStatus`   | Current status of channel                  |
| turnNum                 | number            | Channel nonce                              |
| challengeExpirationTime | number (optional) | Time current challenge on channel elapses  |

### Errors

| Code | Message           | Description                       |
| ---- | ----------------- | --------------------------------- |
| 1200 | Channel not found | Could not find channel in storage |

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

## EnableEthereum

TODO: (MED) Qs:

- What is this doing? Where does it get information about the ethereum provider?
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

## PushMessage

The RPC endpoint that handles sending messages to other potential or current channel participants.

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
