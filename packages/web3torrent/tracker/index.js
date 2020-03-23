const Server = require('bittorrent-tracker').Server;
const log = require('debug')('web3torrent:tracker');
const port = process.env.PORT || 8000;

const server = new Server({
  udp: true,
  http: true,
  ws: true,
  stats: true
});

server.on('error', err => console.error(err.message));

server.on('warning', err => console.warn(err.message));

server.on('listening', () => {
  console.log('Tracker listening on port ' + port);

  if (server.http) {
    const httpAddr = server.http.address();
    const httpHost = httpAddr.address !== '::' ? httpAddr.address : 'localhost';
    const httpPort = httpAddr.port;
    log('HTTP tracker: http://' + httpHost + ':' + httpPort + '/announce');
  }
  if (server.udp) {
    const udpAddr = server.udp.address();
    const udpHost = udpAddr.address;
    const udpPort = udpAddr.port;
    log('UDP tracker: udp://' + udpHost + ':' + udpPort);
  }
  if (server.udp6) {
    const udp6Addr = server.udp6.address();
    const udp6Host = udp6Addr.address !== '::' ? udp6Addr.address : 'localhost';
    const udp6Port = udp6Addr.port;
    log('UDP6 tracker: udp://' + udp6Host + ':' + udp6Port);
  }
  if (server.ws) {
    const wsAddr = server.http.address();
    const wsHost = wsAddr.address !== '::' ? wsAddr.address : 'localhost';
    const wsPort = wsAddr.port;
    log('WebSocket tracker: ws://' + wsHost + ':' + wsPort);
  }

  // TODO: add flag to enable/disable stats.
  if (server.http) {
    const statsAddr = server.http.address();
    const statsHost = statsAddr.address !== '::' ? statsAddr.address : 'localhost';
    const statsPort = statsAddr.port;
    log('Tracker stats: http://' + statsHost + ':' + statsPort + '/stats');
  }
});

server.on('start', (peerId, {info_hash, downloaded}) => {
  log(
    (downloaded > 0 ? 'NEW TORRENT' : 'LEECHER') +
      ' - PeerId: ' +
      peerId +
      ' - infoHash: ' +
      info_hash
  );
});

server.on('complete', (peerId, {info_hash}) =>
  log('COMPLETE - PeerId: ' + peerId + ' - infoHash: ' + info_hash)
);
server.on('update', (peerId, {info_hash}) =>
  log('UPDATE - PeerId: ' + peerId + ' - infoHash: ' + info_hash)
);
server.on('stop', (peerId, {info_hash}) =>
  log('STOP - PeerId: ' + peerId + ' - infoHash: ' + info_hash)
);

server.listen(port);

module.exports = server;
