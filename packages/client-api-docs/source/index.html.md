---
title: API Reference

language_tabs: # must be one of https://git.io/vQNgJ
  - json

toc_footers:
  - <a href='#'>Sign Up for a Developer Key</a>
  - <a href='https://github.com/lord/slate'>Documentation Powered by Slate</a>

includes:

search: true
---

# Introduction

API between the state channel wallet and application.

# DataTypes

## Participant

```json
{
  "participantId": "abc123", // allocated by app
  "signingAddress": "0x123456",
  "destination": "0xa..."
}
```

| Parameter      | Type   | Description                                                     |
|----------------|--------|-----------------------------------------------------------------|
| participantId  | String | App allocated id, used for relaying messages to the participant |
| signingAddress | String | Address used to sign channel updates                            |
| destination    | String | Address of EOA to receive channel proceeds                      |

Note: in the future we might replace the `appId` with a `contactAddress`, which would allow
apps to get the wallet to relay messages itself. An example `contactAddress` would be something
like `https://myserver.com/state_channel_callback`.

## Allocation

```json
{
  "token": "0x...", // 0x0 for ETH
  "allocationItems": [
    {"destination": "0xa...", "amount": "0x1a"},
    {"destination": "0xb...", "amount": "0x1a"}
  ]
}
```

## Message

Format of message sent from the wallet to the app, so that the app can then relay it
to another participant.

```json
{
  "recipient": "user123",
  "sender": "user456",
  "data": "0x456"
}
```

| Parameter | Type   | Description                                                  |
|-----------|--------|--------------------------------------------------------------|
| recipient | String | Identifier of user that the message should be relayed to     |
| sender    | String | Identifier of user that the message is from                  |
| data      | String | Message payload. Format defined by wallet and opaque to app. |

# Initial API

Still a WIP! Adding methods as we need them.

## Push Message

Used to push messages received from other participants into the wallet.

```json
{
  "jsonrpc": "2.0",
  "method": "PushMessage",
  "id": 1,
  "params": {
    "recipient": "user123",
    "sender": "user456",
    "data": "0x123.."
  }
}
```

> Example response

```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "result": {"success": true}
}
```

Note: we don't return the state of the channel, as messages are not necessarily 1-to-1 with channels.

### Errors

| Code | Message           | Meaning                                      |
|------|-------------------|----------------------------------------------|
| 900  | Wrong Participant | The message is not addressed to this wallet. |

## EnableEthereum

Enables the wallet domain against an ethereum provider (e.g., MetaMask). This triggers the connected State Channels wallet to initiate its "Enable Workflow" which will result in a call to `window.ethereum.enable()` in the background from the wallet's domain (e.g., `wallet.statechannels.org`).

```json
{
  "jsonrpc": "2.0",
  "method": "EnableEthereum",
  "id": 1,
  "params": {}
}
```

> Example response

```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "result": {
    "signingAddress": "0xabc...",
    "destinationAddress": "0xabc...",
    "walletVersion": "wallet@0.0.1"
  }
}
```

### Errors

| Code | Message              | Meaning                                                |
|------|----------------------|--------------------------------------------------------|
| 100  | Ethereum Not Enabled | The wallet approval was rejected by the Web3 provider. |

## GetWalletInformation

Gets the current data from the wallet on its `signingAddress`, `destinationAddress`, and `walletVersion`. If the wallet has not been enabled relative to a Web3 Provider, `destinationAddress` will be `undefined`.

```json
{
  "jsonrpc": "2.0",
  "method": "GetWalletInformation",
  "id": 1,
  "params": {}
}
```

> Example response

```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "result": {
    "signingAddress": "0xabc...",
    "destinationAddress": "0xabc...",
    "walletVersion": "wallet@0.0.1"
  }
}
```

## Create Channel

```json
{
  "jsonrpc": "2.0",
  "method": "CreateChannel",
  "id": 1,
  "params": {
    "participants": [
      {
        "participantId": "user123",
        "signingAddress": "0x...",
        "destination": "0xa..."
      },
      {
        "participantId": "user456",
        "signingAddress": "0x...",
        "destination": "0xb..."
      }
    ],
    "allocations": [
      {
        "token": "0x...", // 0x0 for ETH
        "allocationItems": [
          {"destination": "0xa...", "amount": "0x1a"},
          {"destination": "0xb...", "amount": "0x1a"}
        ]
      }
    ],
    "appDefinition": "0x...",
    "appData": "0x...."
  }
}
```

> Example response

```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "result": {
    "channelId": "0xabc123...",
    "status": "proposed",
    "funding": [],
    "participants": [
      {
        "participantId": "user123",
        "signingAddress": "0x...",
        "destination": "0xa..."
      },
      {
        "participantId": "user456",
        "signingAddress": "0x...",
        "destination": "0xb..."
      }
    ],
    "turnNum": 0,
    "allocations": [
      {
        "token": "0x...", // 0x0 for ETH
        "allocationItems": [
          {"destination": "0xa...", "amount": "0x1a"},
          {"destination": "0xb...", "amount": "0x1a"}
        ]
      }
    ],
    "appDefinition": "0x...",
    "appData": "0x...."
  }
}
```

### Parameters

| Parameter     | Type          | Description                                                       |
|---------------|---------------|-------------------------------------------------------------------|
| participants  | Participant[] |                                                                   |
| allocation    | Allocation    | Starting balances                                                 |
| appDefinition | Address       | Address of deployed contract that defines the app                 |
| appData       | String        | Initial app state, encoded as bytes as per appDefinition contract |

### Errors

Errors conform to the [JSON-RPC 2.0 error spec](https://www.jsonrpc.org/specification#error_object).
Beyond the standard errors from that spec, the following domain-specific errors are possible:

| Code | Message                   | Meaning                                                                                                     |
|------|---------------------------|-------------------------------------------------------------------------------------------------------------|
| 1000 | Signing address not found | The wallet can't find the signing key corresponding to the first signing address in the participants array. |
| 1001 | Invalid app definition    | There isn't a contract deployed at the app definition address.                                              |
| 1002 | Unsupported token         | The wallet doesn't support one or more of the tokens appearing in the allocation.                           |

## Join Channel

Possible response to a `Channel Proposed` event.

```json
{
  "jsonrpc": "2.0",
  "method": "JoinChannel",
  "id": 0,
  "params": {
    "channelId": "0xabc123"
  }
}
```

> Example response

```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "result": {
    "channelId": "0xabc123...",
    "status": "open",
    "funding": [],
    "participants": [
      {
        "participantId": "user123",
        "signingAddress": "0x...",
        "destination": "0xa..."
      },
      {
        "participantId": "user456",
        "signingAddress": "0x...",
        "destination": "0xb..."
      }
    ],
    "turnNum": 1,
    "allocations": [
      {
        "token": "0x...", // 0x0 for ETH
        "allocationItems": [
          {"destination": "0xa...", "amount": "0x1a"},
          {"destination": "0xb...", "amount": "0x1a"}
        ]
      }
    ],
    "appDefinition": "0x...",
    "appData": "0x...."
  }
}
```

### Errors

| Code | Message                  | Meaning                                                          |
|------|--------------------------|------------------------------------------------------------------|
| 1100 | Channel not found        | The wallet can't find the channel corresponding to the channelId |
| 1101 | Invalid State Transition | The wallet contains invalid state data                           |

## Update State

```json
{
  "jsonrpc": "2.0",
  "method": "UpdateChannel",
  "id": 0,
  "params": {
    "channelId": "0xabc123",
    "allocations": [
      {
        "token": "0x...", // 0x0 for ETH
        "allocationItems": [
          {"destination": "0xa...", "amount": "18"},
          {"destination": "0xb...", "amount": "6"}
        ]
      }
    ],
    "appData": "0x...."
  }
}
```

> Example response

```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "result": {
    "channelId": "0xabc123...",
    "status": "running",
    "funding": [{"token": "0x0", "amount": "24"}],
    "participants": [
      {
        "participantId": "user123",
        "signingAddress": "0x...",
        "destination": "0xa..."
      },
      {
        "participantId": "user456",
        "signingAddress": "0x...",
        "destination": "0xb..."
      }
    ],
    "turnNum": 7,
    "allocations": [
      {
        "token": "0x...", // 0x0 for ETH
        "allocationItems": [
          {"destination": "0xa...", "amount": "18"},
          {"destination": "0xb...", "amount": "6"}
        ]
      }
    ],
    "appData": "0x...."
  }
}
```

### Errors

| Code | Message            | Meaning                                                                               |
|------|--------------------|---------------------------------------------------------------------------------------|
|      | Channel not found  | The wallet can't find the channel corresponding to the channelId                      |
|      | Invalid app data   | The app data isn't a valid state for the force-move app defined by the app definition |
|      | Invalid transition | The state transition implied by this state is invalid                                 |

## Get State

```json
{
  "jsonrpc": "2.0",
  "method": "GetState",
  "id": 0,
  "params": {
    "channelId": "0xabc123"
  }
}
```

> Example response

```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "result": {
    "channelId": "0xabc123...",
    "status": "running",
    "funding": [{"token": "0x0", "amount": "24"}],
    "participants": [
      {
        "participantId": "user123",
        "signingAddress": "0x...",
        "destination": "0xa..."
      },
      {
        "participantId": "user456",
        "signingAddress": "0x...",
        "destination": "0xb..."
      }
    ],
    "turnNum": 7,
    "allocations": [
      {
        "token": "0x...", // 0x0 for ETH
        "allocationItems": [
          {"destination": "0xa...", "amount": "18"},
          {"destination": "0xb...", "amount": "6"}
        ]
      }
    ],
    "appData": "0x...."
  }
}
```

### Errors

| Code | Message           | Meaning                                                          |
| ---- | ----------------- | ---------------------------------------------------------------- |
|      | Channel not found | The wallet can't find the channel corresponding to the channelId |  |

## Close Channel

The wallet will respond to this request with an error if it is not your turn. If it is your turn, the wallet will respond as soon as it has signed an `isFinal` state, and the channel is updated to `closing` status.

The channel may later update to `closed` status only when other channel participants have responded in kind: this can be detected by listening to `ChannelUpdated` events and filtering on the channel status.

```json
{
  "jsonrpc": "2.0",
  "method": "CloseChannel",
  "id": 3,
  "params": {
    "channelId": "0xabc123"
  }
}
```

> Example response

```json
{
  "jsonrpc": "2.0",
  "id": 3,
  "result": {
    "channelId": "0xabc123...",
    "status": "closing",
    "funding": [],
    "participants": [
      {
        "participantId": "user123",
        "signingAddress": "0x...",
        "destination": "0xa..."
      },
      {
        "participantId": "user456",
        "signingAddress": "0x...",
        "destination": "0xb..."
      }
    ],
    "turnNum": 10,
    "allocations": [
      {
        "token": "0x...", // 0x0 for ETH
        "allocationItems": [
          {"destination": "0xa...", "amount": "0x1a"},
          {"destination": "0xb...", "amount": "0x1a"}
        ]
      }
    ],
    "appDefinition": "0x...",
    "appData": "0x...."
  }
}
```

### Errors

| Code | Message       | Meaning                                             |
|------|---------------|-----------------------------------------------------|
| 300  | Not your turn | You cannot close the channel until it is your turn. |

## Challenge Channel

```json
{
  "jsonrpc": "2.0",
  "method": "ChallengeChannel",
  "id": 0,
  "params": {
    "channelId": "0xabc123"
  }
}
```

> Example response

```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "result": {
    "channelId": "0xabc123...",
    "status": "challenging",
    "funding": [{"token": "0x0", "amount": "24"}],
    "participants": [
      {
        "participantId": "user123",
        "signingAddress": "0x...",
        "destination": "0xa..."
      },
      {
        "participantId": "user456",
        "signingAddress": "0x...",
        "destination": "0xb..."
      }
    ],
    "turnNum": 7,
    "allocations": [
      {
        "token": "0x...", // 0x0 for ETH
        "allocationItems": [
          {"destination": "0xa...", "amount": "18"},
          {"destination": "0xb...", "amount": "6"}
        ]
      }
    ],
    "appData": "0x...."
  }
}
```

### Errors

| Code | Message           | Meaning                                                          |
|------|-------------------|------------------------------------------------------------------|
|      | Channel not found | The wallet can't find the channel corresponding to the channelId |

# Events

Sent from the wallet to the app.

## Message Queued

The application is responsible for relaying messages from the wallet to the other participant(s)
in the channel.
When the wallet wishes to send a message it will emit a `MessageQueued` event.

```json
{
  "jsonrpc": "2.0",
  "method": "MessageQueued",
  "params": {
    "recipient": "user123",
    "sender": "user456",
    "data": "0x1111..."
  }
}
```

## Channel Proposed

Triggered when the wallet receives a message containing a new channel.
App should respond by either calling `JoinChannel`, or TODO.

```json
{
  "jsonrpc": "2.0",
  "method": "ChannelProposed",
  "params": {
    "channelId": "0xabc123",
    "status": "opening",
    "funding": [],
    "participants": [
      {
        "participantId": "user123",
        "signingAddress": "0x...",
        "destination": "0xa..."
      },
      {
        "participantId": "user456",
        "signingAddress": "0x...",
        "destination": "0xb..."
      }
    ],
    "turnNum": 0,
    "allocations": [
      {
        "token": "0x...", // 0x0 for ETH
        "allocationItems": [
          {"destination": "0xa...", "amount": "18"},
          {"destination": "0xb...", "amount": "6"}
        ]
      }
    ],
    "appData": "0x...."
  }
}
```

## Channel Updated

Triggered when any of the following occurs:

- A state is received via `updateChannel`
- A state is received from another participant via `pushMessage`
- Changes to the state of the blockchain are detected (e.g funding or challenges)

In the first two cases, this notification is only triggered when the wallet verifies that the state causes the 'top state' to change.

The 'top state' is the state drawn from the set of **supported** states that has the highest turn number.

(We have glossed over / left undefined what happens in the case where there is more than one top state).

In particular, this means that

- incorrectly formatted
- incorrectly signed
- otherwise unsupported
- out-of-date

states will not trigger this notification. Similarly, a countersignature on an already-supported state will not trigger this notification _unless_ it means that a conclusion proof is now available.

```json
{
  "jsonrpc": "2.0",
  "method": "ChannelUpdated",
  "params": {
    "channelId": "0xabc123...",
    "status": "running",
    "funding": [{"token": "0x0", "amount": "24"}],
    "participants": [
      {
        "participantId": "user123",
        "signingAddress": "0x...",
        "destination": "0xa..."
      },
      {
        "participantId": "user456",
        "signingAddress": "0x...",
        "destination": "0xb..."
      }
    ],
    "turnNum": 7,
    "allocations": [
      {
        "token": "0x...", // 0x0 for ETH
        "allocationItems": [
          {"destination": "0xa...", "amount": "18"},
          {"destination": "0xb...", "amount": "6"}
        ]
      }
    ],
    "appData": "0x...."
  }
}
```
