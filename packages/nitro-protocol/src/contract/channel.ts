import {utils} from 'ethers';

import {Address, Bytes32, Uint256, Uint48} from './types';

export interface Channel {
  channelNonce: Uint48;
  participants: Address[];
  chainId: Uint256;
}

/**
 * Determines if the supplied 32 byte hex string represents an external destination (meaning funds will be paid _out_ of the adjudicator on chain)
 * @param bytes32 a destination
 * @returns true if the destination has 12 leading bytes as zero, false otherwise
 */
export function isExternalDestination(bytes32: Bytes32): boolean {
  return /^0x(0{24})([a-fA-F0-9]{40})$/.test(bytes32);
}

/**
 * Computes the unique id for the supplied channel
 * @param channel Parameters which determine the id
 * @returns a 32 byte hex string representing the id
 */
export function getChannelId(channel: Channel): Bytes32 {
  const {chainId, participants, channelNonce} = channel;
  const channelId = utils.keccak256(
    utils.defaultAbiCoder.encode(
      ['uint256', 'address[]', 'uint256'],
      [chainId, participants, channelNonce]
    )
  );
  if (isExternalDestination(channelId))
    throw Error('This channel would have an external destination as an id');
  return channelId;
}
