import {soliditySha3, toChecksumAddress} from 'web3-utils';
import {Address, Uint32} from './types';
import {ADDRESS_ZERO} from '.';

export interface Channel {
  channelType: Address;
  nonce: Uint32;
  participants: Address[];
  guaranteedChannel?: Address;
}

export function channelID(channel: Channel) {
  const lowercaseID =
    '0x' +
    soliditySha3(
      {type: 'address', value: channel.channelType},
      {type: 'uint32', value: channel.nonce},
      {type: 'address[]', value: channel.participants},
      {type: 'address', value: channel.guaranteedChannel || ADDRESS_ZERO},
    ).slice(26);
  return toChecksumAddress(lowercaseID);
}
