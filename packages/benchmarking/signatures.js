const {ethers} = require('ethers');
const {signState, getStateSignerAddress} = require('@statechannels/nitro-protocol');
const {HashZero, AddressZero} = ethers.constants;

const SAMPLES = 1000;
const wallet = ethers.Wallet.createRandom();
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

function runBenchmark() {
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
    const before = process.hrtime()[1]; // in ns
    signState(state, wallet.privateKey);
    const after = process.hrtime()[1];
    times.push(after - before);
  }
  results['nitro.signState'] = [...times];

  times = [];
  for (let i = 0; i < SAMPLES; i++) {
    const signedState = signState(state, wallet.privateKey);
    const before = process.hrtime()[1]; // in ns
    getStateSignerAddress(signedState, wallet.privateKey);
    const after = process.hrtime()[1];
    times.push(after - before);
  }
  results['nitro.getStateSignerAddress'] = [...times];

  return results;
}

module.exports = {runBenchmark};
