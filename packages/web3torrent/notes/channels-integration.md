# How are channels integrated into web3Torrent?

Web3Torrent uses state channels tech to stream money between webTorrent peers, so that downloaders may pay **Uploader**s for data. The granularity of the payments can be tuned, which alters the trust-performance tradeoff. For example, peers can pay per byte (low trust, high overhead for processing payments resulting in low data transfer speeds) or per Megabyte (higher trust, lower overhead and greater transfer speed).

These tradeoffs are set in [`constants.ts`](https://github.com/statechannels/monorepo/blob/master/packages/web3torrent/src/constants.ts).

## Paid streaming extension

We wrote a small extension to the BiTorrent protocol that allows for extra information to exchanged between torrenting peers: sufficient for them to run a state channel. The extension also allows requests to be intercepted, and the flow of data between peers to be controlled.

## Payment channel client

Web3Torrent includes a general purpose, 2-party unidirectional payment channel client that wraps the state channels wallet provider and provides convenient methods such as `sendPayment`. This client takes care of all downstream encoding to interface with the state channels stack.

## Web3Torrent client

Web3Torrent in based on WebTorrent, and coordinates the torrenting and payment channels.

The client's responsibilities are

- to keep track of peers that have requested data from me, and to maintain a buffer representing the number of bytes I am willing to upload to them
- to interface with the state channels wallet in order to setup and teardown payment channels with my peers
- to send and recieve crypto-money in those payment channels in exchange for data

In more detail:

### Messaging system

When the `MessageQueued` event fires, send the associated data down the `wire`. When a message is received on the wire, pass it on to the state channels wallet using `pushMessage`.

### Channel setup

**Uploader:**: Upon the first request for data of an unkown peer; create a new, unidirectional payment channel with me (the uploader) as the "beneficiary", and the peer (the downloader) as the "payer". This action is associated with the `paymentChannelClient.createChannel()` API call. Then choke the downloader and send them a `STOP` notification (which is a prompt for a payment).

**Downloader:** When the "ChannelProposed" event fires, automatically join that channel.

### Payments

**Uploader**: if a payment is received, "accept" it. Then unchoke the downloader and send a START notification.

**Downloader:** if a STOP is received, make a payment corresponding to some fixed number of bytes.

### Channel teardown

**Downloader:** close the channel if I run out of funds or if if the download finishes.

**Uploader**: the wallet will automatically respond and collaboratively close the channel.

### Channel Disconnects

**Uploader** / **Downloader:** Can click "Challenge" to launch a blockchain challenge against an unresponsive peer. This will close the channel without the need for collaboration with the counterparty.
