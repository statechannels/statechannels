require('@statechannels/channel-provider');
import {ChannelClient} from '@statechannels/channel-client';
const {ethers} = require('ethers');
import {signState, getStateSignerAddress} from '@statechannels/nitro-protocol';
const {HashZero, AddressZero} = ethers.constants;
const {runBenchmark} = require('../signatures');

const channelClient = new ChannelClient(window.channelProvider);

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

window.createChannel = async function() {
  const participants = [ethers.Wallet.createRandom().address, ethers.Wallet.createRandom().address];

  const allocations = [];
  const appDefinition = '0x0';
  // TODO format this properly
  await channelClient.createChannel(
    participants,
    allocations,
    appDefinition,
    appData,
    fundingStrategy
  );
};

window.signMessage = async function() {
  const wallet = ethers.Wallet.createRandom();
  const before = Date.now();
  wallet.signMessage('test message');
  const after = Date.now();
  const time = after - before;
  document.getElementById('sign-message-time').innerText = time.toFixed(2) + 'ms';
};

window.signState = async function() {
  const before = Date.now();
  signState(state, wallet.privateKey);
  const after = Date.now();
  const time = after - before;
  // TODO measure time taken to get response.
  document.getElementById('sign-state-time').innerText = time.toFixed(2) + 'ms';
};

window.getStateSignerAddress = async function() {
  const signedState = signState(state, wallet.privateKey);
  const before = Date.now();
  getStateSignerAddress(signedState, wallet.privateKey);
  const after = Date.now();
  const time = after - before;
  document.getElementById('get-state-signer-address-time').innerText = time.toFixed(2) + 'ms';
};

window.runBenchmark = async function() {
  console.log('running benchmark...');
  const results = await runBenchmark();
  console.log('ran benchmark');
  const json = JSON.stringify(results);
  const blob = new Blob([json], {type: 'application/json'});
  const url = URL.createObjectURL(blob);
  const a = document.appendChild(document.createElement('a'));
  a.download = 'times-browser.json';
  a.href = url;
  a.textContent = 'Download results-browser.json';
  a.click();
};
