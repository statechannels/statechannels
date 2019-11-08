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
| -------------- | ------ | --------------------------------------------------------------- |
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
    {"destination": "0xa...", "amount": "12"},
    {"destination": "0xb...", "amount": "12"}
  ]
}
```

## Message

Format of message sent from the wallet to the app, so that the app can then relay it
to another participant.

```javascript
const participantId = 'abc123'; // allocated by app
const data = '0x456';
const message = new Message(participantId, data);
```

```json
{
  "participantId": "abc123",
  "data": "0x456"
}
```

| Parameter     | Type   | Description                                                  |
| ------------- | ------ | ------------------------------------------------------------ |
| participantId | String | Identifier or user that the message should be relayed to     |
| data          | String | Message payload. Format defined by wallet and opaque to app. |

# Initial API

Still a WIP! Adding methods as we need them.

## List identities

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
          {"destination": "0xa...", "amount": "12"},
          {"destination": "0xb...", "amount": "12"}
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
          {"destination": "0xa...", "amount": "12"},
          {"destination": "0xb...", "amount": "12"}
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
| ------------- | ------------- | ----------------------------------------------------------------- |
| participants  | Participant[] |                                                                   |
| allocation    | Allocation    | Starting balances                                                 |
| appDefinition | Address       | Address of deployed contract that defines the app                 |
| appData       | String        | Initial app state, encoded as bytes as per appDefinition contract |

### Errors

Errors conform to the [JSON-RPC 2.0 error spec](https://www.jsonrpc.org/specification#error_object).
Beyond the standard errors from that spec, the following domain-specific errors are possible:

| Code | Message                   | Meaning                                                                                                     |
| ---- | ------------------------- | ----------------------------------------------------------------------------------------------------------- |
|      | Signing address not found | The wallet can't find the signing key corresponding to the first signing address in the participants array. |
|      | Invalid app definition    | There isn't a force-move compatible app contract deployed at the app definition address                     |
|      | Invalid app data          | The app data isn't a valid state for the force-move app defined by the app definition                       |
|      | Unsupported token         | The wallet doesn't support one or more of the tokens appearing in the allocation.                           |

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
          {"destination": "0xa...", "amount": "12"},
          {"destination": "0xb...", "amount": "12"}
        ]
      }
    ],
    "appDefinition": "0x...",
    "appData": "0x...."
  }
}
```

### Errors

| Code | Message           | Meaning                                                          |
| ---- | ----------------- | ---------------------------------------------------------------- |
|      | Channel not found | The wallet can't find the channel corresponding to the channelId |

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

## Close Channel

```javascript
await channelProvider.closeChannel(channelId);
```

# Events

Sent from the wallet to the app.

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

Triggered when a channel update occurs by any means, including:

- Messages received from another participant
- Changes to the state of the blockchain (e.g funding or challenges)
- Changes triggered by the current app via `updateState` etc.

```json
{
  "jsonrpc": "2.0",
  "method": "ChannelUpdated",
  "params": {
    "channelId": "0xabc123...",
    "status": "running",
    "funding": [{ "token": "0x0", "amount": "24"}],
    "participants": [
      {"participantId": "user123", "signingAddress": "0x...", "destination": "0xa..."},
      {"participantId": "user456", "signingAddress": "0x...", "destination": "0xb..."}
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
    "appData": "0x....""
  }
}
```

## Message Queued

The application is responsible for relaying messages from the wallet to the other participant(s)
in the channel.
When the wallet wishes to send a message it will emit a `MessageQueued` event.

```json
{
  "jsonrpc": "2.0",
  "method": "MessageQueued",
  "params": {
    "participantId": "user123",
    "data": "0x1111..."
  }
}
```
