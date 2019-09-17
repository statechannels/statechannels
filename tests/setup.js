module.exports = () => {
  const { Server } = require('bittorrent-tracker');

  global.tracker = new Server({ http: true, ws: false, udp: false });
  global.tracker.listen(4242);
};
