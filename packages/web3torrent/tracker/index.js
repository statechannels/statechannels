const Server = require('bittorrent-tracker').Server;
const log = require('pino')({prettyPrint: true, translateTime: true, name: 'w3t-tracker'});
const { ethers } = require('ethers');

const port = process.env.PORT || 8000;

const ACTIONS = {CONNECT: 0, ANNOUNCE: 1, SCRAPE: 2, ERROR: 3};
const EVENTS = {START: 'started', COMPLETE: 'completed', UPDATE: undefined, STOP: undefined};

const server = new Server({
  udp: true,
  http: true,
  ws: true,
  stats: true,
  interval: 150000,
  filter: function(_, params, cb) {
    /**
     * The function doesn't actually checks if it is the same pseAccount or not, it only checks the
     * existence and validity of the value. It's use is to filter other clients of using this tracker.
     */
    if (params && params.action === ACTIONS.ANNOUNCE && params.event === EVENTS.START) {
      if (!params.pseAccount || !ethers.utils.isAddress((params.pseAccount))) {
        cb(new Error('401 - Unauthorized client - This tracker is for Web3Torrents only'));
      } else {
        cb(null);
      }
    } else {
      cb(null);
    }
  }
});

server.on('error', err => log.error(err.message));

server.on('warning', err => log.warn(err.message));

server.on('listening', () => {
  log.info('Tracker listening on port ' + port);

  if (server.http) {
    const httpAddr = server.http.address();
    const httpHost = httpAddr.address !== '::' ? httpAddr.address : 'localhost';
    const httpPort = httpAddr.port;
    log.info('HTTP tracker: http://' + httpHost + ':' + httpPort + '/announce');
  }
  if (server.udp) {
    const udpAddr = server.udp.address();
    const udpHost = udpAddr.address;
    const udpPort = udpAddr.port;
    log.info('UDP tracker: udp://' + udpHost + ':' + udpPort);
  }
  if (server.udp6) {
    const udp6Addr = server.udp6.address();
    const udp6Host = udp6Addr.address !== '::' ? udp6Addr.address : 'localhost';
    const udp6Port = udp6Addr.port;
    log.info('UDP6 tracker: udp://' + udp6Host + ':' + udp6Port);
  }
  if (server.ws) {
    /**
     * As far as I know, the trackers and client use mostly WebSockets.
     * For some reason HTTP and UDP don't get used.
     * The source of an issue where the tracker test would fail a lot,
     *              was that the websocket would get dropped by heroku.
     */
    const wsAddr = server.http.address();
    const wsHost = wsAddr.address !== '::' ? wsAddr.address : 'localhost';
    const wsPort = wsAddr.port;
    log.info('WebSocket tracker: ws://' + wsHost + ':' + wsPort);
  }

  // TODO: add flag to enable/disable stats.
  if (server.http) {
    const statsAddr = server.http.address();
    const statsHost = statsAddr.address !== '::' ? statsAddr.address : 'localhost';
    const statsPort = statsAddr.port;
    log.info('Tracker stats: http://' + statsHost + ':' + statsPort + '/stats');
  }
});

server.on('start', (peerId, {info_hash, downloaded}) => {
  log.info(
    (downloaded > 0 ? 'NEW TORRENT' : 'LEECHER') +
      ' - PeerId: ' +
      peerId +
      ' - infoHash: ' +
      info_hash
  );
});

server.on('complete', (peerId, {info_hash}) =>
  log.info('COMPLETE - PeerId: ' + peerId + ' - infoHash: ' + info_hash)
);
server.on('update', (peerId, {info_hash}) =>
  log.info('UPDATE - PeerId: ' + peerId + ' - infoHash: ' + info_hash)
);
server.on('stop', (peerId, {info_hash}) =>
  log.info('STOP - PeerId: ' + peerId + ' - infoHash: ' + info_hash)
);

server.listen(port);

module.exports = server;
