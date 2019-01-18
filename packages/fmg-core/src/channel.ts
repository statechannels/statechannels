import { toHex32, padBytes32 } from './utils';
import { soliditySha3, toChecksumAddress } from 'web3-utils';

class Channel {
  channelType: string;
  channelNonce: number;
  participants: string[];

  constructor(channelType, channelNonce, participants) {
    this.channelType = channelType;
    this.channelNonce = channelNonce;
    this.participants = participants;
  }

  get numberOfParticipants() {
    return this.participants.length;
  }

  get id() {
    const lowercaseID =  "0x" + soliditySha3(
      { type: 'address', value: this.channelType },
      { type: 'uint256', value: this.channelNonce },
      { type: 'address[]', value: this.participants },
    ).slice(26);

    return toChecksumAddress(lowercaseID);
  }

  toHex() {
    return (
      padBytes32(this.channelType) +
      toHex32(this.channelNonce).substr(2) +
      toHex32(this.numberOfParticipants).substr(2) +
      this.participants.map(x => padBytes32(x).substr(2)).join('')
    );
  }
}

export { Channel };
