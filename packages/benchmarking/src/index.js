require('@statechannels/channel-provider');
import {
  ChannelClient,
} from '@statechannels/channel-client';
const {ethers} = require('ethers');

const channelClient = new ChannelClient(window.channelProvider);

window.createChannel = async function() {

  const participants = [
      ethers.Wallet.createRandom().address,
      ethers.Wallet.createRandom().address,
    ];

  const allocations = [];
  const appDefinition = '0x0';
  // TODO format this properly
  await channelClient.createChannel(participants,allocations,appDefinition,appData,fundingStrategy);

  // TODO measure time taken to get response. 
  document.getElementById('create-channel-time').innerText = '200ms'; // TODO echo correct delay
}

window.signMessage = async function() {
  const wallet = ethers.Wallet.createRandom();
  const before = Date.now();
  wallet.signMessage('test message');
  const after = Date.now();
  const time = after-before;
  // TODO measure time taken to get response. 
  document.getElementById('sign-message-time').innerText = time.toFixed(2) + 'ms';
}
