import {Wallet} from '@ethersproject/wallet';

import {Channel, getChannelId} from '../src';

export const chainId = '0x1';
export const channelNonce = 2;

export const Alice = new Wallet(
  '0x277fb9e0ad81dc836c60294e385b10dfcc0a9586eeb0b1d31da92e384a0d2efa'
);
export const Bob = new Wallet('0x277fb9e0ad81dc836c60294e385b10dfcc0a9586eeb0b1d31da92e384a0d2efa');
export const participants = [Alice.address, Bob.address];

const channel: Channel = {chainId, channelNonce, participants};
export const channelId = getChannelId(channel);
