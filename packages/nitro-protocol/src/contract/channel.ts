import {Address, Bytes32, Uint256, Uint48} from './types';
import {encode} from './abi';
import {keccak256} from './keccak';

export interface Channel {
  channelNonce: Uint48;
  participants: Address[];
  chainId: Uint256;
}

export function getChannelId(channel: Channel): Bytes32 {
  const {chainId, participants, channelNonce} = channel;
  const encoded = encode(
    ['uint256', 'address[]', 'uint256'],
    [chainId, participants, channelNonce]
  );

  return keccak256(encoded);
}
