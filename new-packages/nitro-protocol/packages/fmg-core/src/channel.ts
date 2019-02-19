import { soliditySha3, toChecksumAddress } from 'web3-utils';
import { Address, Uint32 } from './types';

export interface Channel {
  channelType: Address;
  channelNonce: Uint32;
  participants: Address[];
}

export function channelID(channel: Channel) {
  const lowercaseID =  "0x" + soliditySha3(
    { type: 'address', value: channel.channelType },
    { type: 'uint256', value: channel.channelNonce },
    { type: 'address[]', value: channel.participants },
  ).slice(26);

  return toChecksumAddress(lowercaseID);
}