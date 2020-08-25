# JSON RPC Specification

## TODOs

Make decisions on the following:

- Finalize error conventions
- Finalize methods needed in core rpc interface (used across all envs, and extensible), inc. common getters
- Finalize API (close channel, defund channel, withdraw)
- Finalize `ChannelStatus`

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

Returns a `ChannelResult`

### Errors

| Code | Message                   | Description                                                 |
| ---- | ------------------------- | ----------------------------------------------------------- |
| 1400 | Unsupported token         | Token in allocations not supported                          |
| 1400 | Invalid participants      | Provided participants are invalid                           |
| 1400 | Invalid app definition    | App definition is not valid address                         |
| 1400 | Invalid app data          | App data not valid                                          |
| 1401 | Insufficient funds        | Insufficient funds to create channel with given allocations |
| 1404 | Signing address not found | Unable to find expected ephemeral key                       |

## JoinChannel

Called when you would are joining a channel that has been created. Generally, creating a channel is done, and a notification is sent to the desired counterparty, who then dispatches the `JoinChannel` request.

### Parameters

| Name      | Type      | Description               |
| --------- | --------- | ------------------------- |
| channelId | `Bytes32` | Unique channel identifier |

### Response

Returns a `ChannelResult`

### Errors

| Code | Message            | Description                                 |
| ---- | ------------------ | ------------------------------------------- |
| 1403 | Invalid transition | Channel cannot be joined                    |
| 1404 | Channel not found  | Could not find channel to update in storage |

## UpdateChannel

Used to take a turn in a channel and returns the updated channel information.

### Parameters

| Name        | Type           | Description                        |
| ----------- | -------------- | ---------------------------------- |
| channelId   | `Byttes32`     | Derived channel identifier         |
| allocations | `Allocation[]` | Updated token balances for channel |
| appData     | string         | Encoded updated application state  |

### Response

Returns a `ChannelResult`

### Errors

| Code | Message            | Description                                 |
| ---- | ------------------ | ------------------------------------------- |
| 1400 | Invalid app data   | Incorrect encoded app information           |
| 1403 | Not your turn      | Cannot update channel                       |
| 1403 | Invalid transition | Illegal state transition proposed           |
| 1404 | Channel not found  | Could not find channel to update in storage |

## CloseChannel

This is the method used to propose a cooperative channel closure. Can be called on a channel that is properly `running`, and will begin the process of returning funds to the ledger channel for application or virtual channels, or to the `destination` defined for each `Participant`.

### Parameters

| Name      | Type    | Description               |
| --------- | ------- | ------------------------- |
| channelId | Bytes32 | Unique channel identifier |

### Response

Returns a `ChannelResult`

### Errors

| Code | Message            | Description                                   |
| ---- | ------------------ | --------------------------------------------- |
| 1403 | Invalid transition | Cannot close channel                          |
| 1403 | Not your turn      | Not your turn to update channel, cannot close |
| 1404 | Channel not found  | Could not find channel to update in storage   |

## DefundChannel

Agrees to close channel at current state, and move funds back into ledger channel allocations.

### Parameters

| Name      | Type      | Description               |
| --------- | --------- | ------------------------- |
| channelId | `Bytes32` | Unique channel identifier |

### Response

Returns a `ChannelResult`

### Errors

| Code | Message            | Description                                      |
| ---- | ------------------ | ------------------------------------------------ |
| 1403 | Invalid transition | Cannot defund channel                            |
| 1403 | Not your turn      | Not your turn to update channel, cannot withdraw |
| 1404 | Channel not found  | Could not find channel to update in storage      |

## Withdraw

Used to send funds from channel to a given destination.

TODO: is this only for ledger channels, or application channels as well?
TODO: should we use the `Participant.destination`? or is the `destination` is part of the outcome?

### Parameters

| Name        | Type      | Description               |
| ----------- | --------- | ------------------------- |
| channelId   | `Bytes32` | Unique channel identifier |
| destination | `Address` | Unique channel identifier |

### Response

Returns a `ChannelResult`

### Errors

| Code | Message             | Description                                      |
| ---- | ------------------- | ------------------------------------------------ |
| 1400 | Invalid destination | Destination is not valid address                 |
| 1403 | Invalid transition  | Cannot withdraw channel                          |
| 1403 | Not your turn       | Not your turn to update channel, cannot withdraw |
| 1404 | Channel not found   | Could not find channel to update in storage      |

## ChallengeChannel

Initiates an onchain challenge for a given channel. Will take the currently stored channel state, and put it onchain returning a `ChannelResult` object, and limiting the usage of the channel.

### Parameters

| Name      | Type    | Description               |
| --------- | ------- | ------------------------- |
| channelId | Bytes32 | Unique channel identifier |

### Response

Returns a `ChannelResult`

### Errors

| Code | Message           | Description                                 |
| ---- | ----------------- | ------------------------------------------- |
| 1404 | Channel not found | Could not find channel to update in storage |

## GetChannels

Returns all channels associated with your wallet.

### Parameters

| Name          | Type               | Description                                         |
| ------------- | ------------------ | --------------------------------------------------- |
| includeClosed | boolean (optional) | Whether closed/inactive channels should be included |

### Response

Returns a `ChannelResult[]`

## GetState

Returns the current state of a given channel.

### Parameters

| Name      | Type    | Description               |
| --------- | ------- | ------------------------- |
| channelId | Bytes32 | Unique channel identifier |

### Response

Returns a `ChannelResult`

### Errors

| Code | Message           | Description                       |
| ---- | ----------------- | --------------------------------- |
| 1404 | Channel not found | Could not find channel in storage |

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

| Code | Message          | Description                      |
| ---- | ---------------- | -------------------------------- |
| 1404 | Wallet not found | Could not find wallet in storage |

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

| Code | Message               | Description                                  |
| ---- | --------------------- | -------------------------------------------- |
| 1404 | Participant not found | Could not find participant                   |
| 1403 | Unauthorized          | Unauthorized to make calls to channel wallet |
