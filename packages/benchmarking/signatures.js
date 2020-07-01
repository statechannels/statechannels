const {ethers} = require('ethers');
const {signState, getStateSignerAddress} = require('@statechannels/nitro-protocol');
const {HashZero, AddressZero} = ethers.constants;

const wallet = ethers.Wallet.createRandom();

async function time(fn, args, thisArg) {
  let before, after;
  if (typeof window === 'undefined') {
    before = process.hrtime()[1]; // higher precision (in ns)
    await fn.apply(thisArg, args);
    after = process.hrtime()[1]; // higher precision (in ns)
  } else {
    before = performance.now() * 1e6; // in ns
    await fn.apply(thisArg, args);
    after = performance.now() * 1e6; // in ns
  }
  return after - before;
}

const SAMPLES = 1000;

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
const signedState = signState(state, wallet.privateKey);

async function runBenchmark() {
  const results = {
    'ethers.signMessage': [],
    'ethers.signMessage2': [],
    'nitro.signState': [],
    'nitro.getStateSignerAddress': []
  };
  for (let i = 0; i < SAMPLES; i++) {
    results['ethers.signMessage'].push(await time(wallet.signMessage, ['test message'], wallet));
    results['nitro.signState'].push(await time(signState, [state, wallet.privateKey]));
    results['nitro.getStateSignerAddress'].push(
      await time(getStateSignerAddress, [signedState, wallet.privateKey])
    );
  }
  return results;
}

module.exports = {runBenchmark};
