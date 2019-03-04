import Web3 from 'web3';
import { Channel, SolidityParameter } from 'fmg-core';
import { channelID } from 'fmg-core/lib/channel';

export type SignableData = string | SolidityParameter | SolidityParameter[];
export default class ChannelWallet {
  get address() {
    return this.account.address;
  }

  get privateKey() {
    return this.account.privateKey;
  }

  get channelId(): string {
    if (this.channel) {
      return channelID(this.channel);
    } else {
      throw new Error("Channel must be opened");
    }
  }

  account: any; // todo: figure out how to do types with web3
  id: string;
  channel: Channel | null;

  constructor(privateKey?: string, id?: string) {
    const web3 = new Web3('');
    if (privateKey) {
      this.account = web3.eth.accounts.privateKeyToAccount(privateKey);
    } else {
      this.account = web3.eth.accounts.create();
    }
    if (id) {
      this.id = id;
    }
  }

  openChannel(channel: Channel): Channel {
    if (this.channel) {
      throw new Error("Only one open channel is supported");
    }
    this.channel = channel;
    return channel;
  }

  closeChannel() {
    this.channel = null;
  }

}
