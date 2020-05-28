## Web3Torrent

[![Netlify Status](https://api.netlify.com/api/v1/badges/440f8079-95c2-4ffa-8a80-d9afc1e52616/deploy-status)](https://app.netlify.com/sites/sc-web3torrent/deploys)

![Web3Torrent App Screenshot](https://user-images.githubusercontent.com/118913/68315088-05c34880-0096-11ea-94ab-bc86337f15d2.png)

Web3Torrent is a streaming torrent implementation, based on [Webtorrent](https://github.com/webtorrent/webtorrent) and including a custom BitTorrent protocol extension that allows peers to block/choke and unblock other peers, conditional on (for example) the receipt of a payment.

### The BitTorrent Wire extension

The Extension establishes a basic way to send/recieve messages between peers, and it allows a peer to easily control what to do when requests for torrent pieces are receieved.

A Whimsical Diagram was made to explain how Web3Torrent, you can see it [here](https://whimsical.com/Sq6whAwa8aTjbwMRJc7vPU).

### The client

As the client is a custom, extended version of [Webtorrent](https://github.com/webtorrent/webtorrent), most of the docs from [their docs page](https://webtorrent.io/docs) are applicable on this project.

**There is a couple of extra properties and methods to take into account, the rest you can assume are pretty much the same**:

- `pseAccount` it's an ID, wich identifies the client (peer). This can be set when the client is instantiated (by passing an object with the key `pseAccount`). We use the state channel wallet signing address for this ID.
- `channelsByInfoHash` holds a list of torrents (identified by infoHash), in wich every torrent has a list of allowed peers (identified by pseAccount)
  this list is used by each peer Client, to control which peer is trying to leech files, and see who is allowed to do so.
- `togglePeer (affectedTorrent, peerAccount)` is a method that allows a user to choke/unchoke a peer

### Demo

You can try it out [here](https://sc-web3torrent.netlify.com/).

The screen recording below demonstrates a seeder on the left and a leacher on the right. The left seeder has a fresh wallet without a connection with the hub. The right leacher has a connection with the hub, allowing it to quickly open a payment channel and start downloading.

![A screen recording](demo.gif)

### Installing and using

Just clone this repo and start tinkering. :-)

```shell
git clone git@github.com:statechannels/monorepo
cd monorepo
yarn
cd packages/web3torrent
yarn start
```

### Storybook

If you want to take a look at the UI components we built for this app, we have a [Storybook](https://storybook.js.org). To use it:

```shell
yarn storybook
```

You'll see a screen like this in your browser:

![Screenshot of Storybook](https://user-images.githubusercontent.com/118913/68314770-7e75d500-0095-11ea-9f5a-b571e7a0654b.png)

- On the left-side panel, you'll see each a page for each component. Click through those links to navigate.
- The **Knobs** tab, displayed on the bottom panel, allows you to play with the component's properties. Use the different options to see how the component changes.

### Dev Notes

- Because of [this issue](https://github.com/webtorrent/webtorrent/issues/1757) we require `end-of-stream` to be fixed at `1.4.1`.
- To enable logging to the console, set `LOG_DESTINATION=console`
- To enable logging to a file when testing, set `LOG_DESTINATION=someFilenameOtherThanConsole`
