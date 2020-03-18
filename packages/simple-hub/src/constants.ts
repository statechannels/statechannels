import {ethers} from 'ethers';

export const cFirebasePrefix = process.env.FIREBASE_PREFIX || 'default-prefix';

export const cHubChannelPK =
  process.env.HUB_CHANNEL_PK ||
  '0x1b427b7ab88e2e10674b5aa92bb63c0ca26aa0b5a858e1d17295db6ad91c049b';
export const cHubChannelSigningAddress = new ethers.Wallet(cHubChannelPK).address;

// This account is provided eth in @statechannels/devtools/utils/startGanache.js
export const cHubChainPK =
  process.env.HUB_CHAIN_PK || '0x7ab741b57e8d94dd7e1a29055646bafde7010f38a900f55bbd7647880faa6ee8';
export const cHubChainAddress = new ethers.Wallet(cHubChainPK).address;

export const cHubParticipantId = process.env.HUB_PARTICIPANT_ID || 'firebase:simple-hub';
