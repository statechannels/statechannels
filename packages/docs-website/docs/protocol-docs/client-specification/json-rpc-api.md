# JSON RPC Specification

## Common Types

### Participant

Contains identifying information about channel members:

| Name           | Type      | Description                                              |
| -------------- | --------- | -------------------------------------------------------- |
| participantId  | string    | Unique identifier of channel participant                 |
| signingAddress | `Address` | Address used to sign channel state updates               |
| destination    | `Address` | Address to receive funds in case of disputes/withdrawals |

### Allocation

Tracks information about the channel balance:

| Name            | Type               | Description                                              |
| --------------- | ------------------ | -------------------------------------------------------- |
| token           | `Address`          | Address of asset on chain                                |
| allocationItems | `AllocationItem[]` | Assigns some asset to a given user by address and amount |

### ChannelResult

Tracks general information about a channel, typically returned from all methods that update the channel state:

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

where the `ChannelStatus` is one of:

- `proposed`: wallet has stored a channel, but no states are signed
- `opening`: channel has been joined, but is not properly funded
- `funding`: ???
- `running`: channel is ready to use
- `challenging`: channel is in an ongoing dispute
- `responding`: channel dispute is ongoing, and it is your turn to create a channel update (must send `UpdateChannel` request)
- `closing`: channel cannot be used, but funds are still locked
- `closed`: funds have been released from channel

TODO: (HIGH) Decided on finalized statuses. What is opening vs. proposed vs. funding vs. running? Is the channel thrown back into the `funding` state when it runs out of money?

TODO: (MED): What about the `SingleChannelResult` and `MultipleChannelResult` documented in the `server-wallet` package?

## CreateChannel

### Parameters

| Name            | Type                            | Description                                |
| --------------- | ------------------------------- | ------------------------------------------ |
| participants    | `Participant[]`                 | Identifying information members of channel |
| allocations     | `Allocation[]`                  | Array of funding amounts for participants  |
| appDefinition   | Address                         | Address of contract governing the channel  |
| appData         | bytes                           | Encoded initial state of app               |
| fundingStrategy | `Direct` \|`Ledger` \|`Virtual` | Funding method (type) of channel           |

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

| Code | Message                | Description                           |
| ---- | ---------------------- | ------------------------------------- |
| 1000 | SigningAddressNotFound | Unable to find expected ephemeral key |
| 1001 | InvalidAppDefinition   | App definition not valid address      |
| 1002 | UnsupportedToken       | Token in allocations not supported    |

TODO: (HIGH) Verify these are all of the expected errors (what if request times out? what if some participant refuses to join the channel?)

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

## UpdateChannel

Used to take a turn in a channel and returns a `ChannelResult`.

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

TODO: (HIGH) Finalize errors

## Withdraw

TODO: (HIGH) Finalize API

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

TODO: (HIGH) Finalize errors

## ChallengeChannel

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

Returns the generic channel wallet information and version for the channel participant.

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
