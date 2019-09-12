## Web3Torrent
Web3Torrent is a streaming torrent implementation, based of [Webtorrent](https://github.com/webtorrent/webtorrent) and including a custom BitTorrent protocol extension, that allows seeders to block/choke and unblock other peers by user request.

### The BitTorrent Wire extension
The Extension establishes a basic way to send/recieve messages between peers, and it allows the seeder to easily control what to do when request for torrent pieces are receieved.

### The client
As the client is a custom, extended version of [Webtorrent](https://github.com/webtorrent/webtorrent), most of the docs from [their docs page](https://webtorrent.io/docs) are applicable on this project.

**There is a couple of extra properties and methods to take into account, the rest you can assume are pretty much the same**:

* `pseAccount` it's an ID, wich identifies the client (peer). This can be set when the client is instantiated (by passing an object with the key `pseAccount`), or a random number is assigned.
* `allowedPeers` holds a list of torrents (identified by infoHash), in wich every torrent has a list of allowed peers (identified by pseAccount)
  this list is used by each peer Client, to control which peer is trying to leech files, and see who is allowed to do so.
* `togglePeer (affectedTorrent, peerAccount)` is a method that allows a user to choke/unchoke a peer

#### Demo
The demo is the UI made for this. It's done in react, and it assumes that only one torrent is being shared or downloaded, and that torrent only has one file.
You can see it working [here](https://cf-webtorrent-mvp.herokuapp.com/)

#### Installing and using

Just clone this repo and start tinkering. :-)
