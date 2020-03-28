process.env.REACT_APP_FAKE_CHANNEL_PROVIDER = 'true';
process.env.REACT_APP_SINGLE_ASSET_PAYMENT_CONTRACT_ADDRESS =
  '0x430869383d611bBB1ce7Ca207024E7901bC26b40'; // some dummy value to prevent 'not defined' errors

module.exports = () => {
  const {Server} = require('bittorrent-tracker');

  global.tracker = new Server({http: true, ws: false, udp: false});
  global.tracker.listen(4242);
};
