import {Uint256, Address, Bytes32} from './types';
import {defaultAbiCoder, keccak256} from 'ethers/utils';

export interface Channel {
  channelNonce: Uint256;
  participants: Address[];
  chainId: Uint256;
}

export function getChannelId(channel: Channel): Bytes32 {
  const {chainId, participants, channelNonce} = channel;
  return keccak256(
    defaultAbiCoder.encode(
      ['uint256', 'address[]', 'uint256'],
      [chainId, participants, channelNonce],
    ),
  );
}
