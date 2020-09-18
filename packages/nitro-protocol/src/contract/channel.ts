import {utils} from 'ethers';

import {Address, Destination, Uint256, Uint48} from './types';

export interface Channel {
  channelNonce: Uint48;
  participants: Address[];
  chainId: Uint256;
}

export function getChannelId(channel: Channel): Destination {
  const {chainId, participants, channelNonce} = channel;
  return utils.keccak256(
    utils.defaultAbiCoder.encode(
      ['uint256', 'address[]', 'uint256'],
      [chainId, participants, channelNonce]
    )
  ) as Destination;
}
