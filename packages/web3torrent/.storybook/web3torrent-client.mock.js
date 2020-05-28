const React = require('react');
const utils = require('./../src/utils/test-utils');

function mockWeb3TorrentClient() {
  const _peers = utils.createMockPeersByChannel();
  const torrent = utils.createMockTorrentUI({
    numPeers: Object.keys(_peers).length,
    _peers,
    wires: Array.from(_peers, ({wire}) => wire)
  });

  return {torrents: [torrent], paymentChannelClient: {challengeChannel: _ => {}}};
}

const web3Torrent = mockWeb3TorrentClient();

const Web3TorrentContext = React.createContext(web3Torrent);

module.exports = {Web3TorrentContext, web3Torrent};
