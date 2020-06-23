const {ethers} = require('ethers');
const fs = require('fs');
const {signState} = require('@statechannels/nitro-protocol');
const {HashZero, AddressZero} = ethers.constants;

const SAMPLES = 1000;
const wallet = ethers.Wallet.createRandom();
const results = {};
let times;
times = [];
for (let i = 0; i < SAMPLES; i++) {
  const before = process.hrtime()[1]; // in ns
  wallet.signMessage('test message');
  const after = process.hrtime()[1];
  times.push(after - before);
}
results['ethers.signMessage'] = [...times];

times = [];
for (let i = 0; i < SAMPLES; i++) {
  const before = process.hrtime()[1]; // in ns
  wallet.signMessage(
    'a much longer message a much longer message a much longer message a much longer message a much longer message a much longer message a much longer message a much longer message a much longer message a much longer message a much longer message a much longer message a much longer message a much longer message a much longer message a much longer message a much longer message a much longer message a much longer message a much longer message a much longer message a much longer message a much longer message a much longer message a much longer message a much longer message a much longer message a much longer message a much longer message a much longer message a much longer message a much longer message a much longer message a much longer message a much longer message a much longer message a much longer message a much longer message a much longer message a much longer message a much longer message a much longer message a much longer message a much longer message a much longer message a much longer message a much longer message a much longer message a much longer message a much longer message '
  );
  const after = process.hrtime()[1];
  times.push(after - before);
}
results['ethers.signMessage2'] = [...times];

times = [];
for (let i = 0; i < SAMPLES; i++) {
  const state = {
    isFinal: false,
    channel: {
      chainId: '0x0',
      channelNonce: '0x0',
      participants: [wallet.address]
    },
    outcome: [
      {
        assetHolderAddress: AddressZero,
        allocationItems: []
      }
    ],
    appDefinition: AddressZero,
    appData: HashZero,
    challengeDuration: 1,
    turnNum: 1
  };
  const before = process.hrtime()[1]; // in ns
  signState(state, wallet.privateKey);
  const after = process.hrtime()[1];
  times.push(after - before);
}
results['nitro.signState'] = [...times];

fs.writeFile('times.json', JSON.stringify(results), err => {
  if (err) throw err;
});
