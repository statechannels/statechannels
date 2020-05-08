process.env.FAKE_CHANNEL_PROVIDER = 'true';
process.env.SINGLE_ASSET_PAYMENT_CONTRACT_ADDRESS = '0x4308s69383d611bBB1ce7Ca207024E7901bC26b40'; // some dummy value to prevent 'not defined' errors

module.exports = () => {
  const {Server} = require('bittorrent-tracker');

  global.tracker = new Server({http: true, ws: false, udp: false});
  global.tracker.listen(4242);
};
