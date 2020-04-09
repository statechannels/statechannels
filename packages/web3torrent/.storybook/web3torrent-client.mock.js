const React = require('react');
const utils = require('./../src/utils/test-utils');

const mockWeb3TorrentClient = () => {
  const _peers = utils.createMockTorrentPeers();
  const torrent = utils.createMockTorrent({
    numPeers: Object.keys(_peers).length,
    _peers,
    wires: Array.from(_peers, ({ wire }) => wire)
  });

  return { torrents: [torrent] };
};

const web3Torrent = mockWeb3TorrentClient();

const Web3TorrentContext = React.createContext(web3Torrent);

module.exports = {
  Web3TorrentContext,
  web3Torrent
};
