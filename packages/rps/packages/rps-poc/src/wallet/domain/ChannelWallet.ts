import Web3 from 'web3';
import { Channel, sign as coreSign, recover as coreRecover, decodeSignature, SolidityParameter } from 'fmg-core';

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
      return this.channel.id;
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

  sign(data: SignableData): string {
    const { v, r, s } =  coreSign(data, this.account.privateKey);
    return r + s.substr(2) + v.substr(2);
  }

  recover(data: SignableData, signature: string) {
    const { v, r, s } = decodeSignature(signature);
    return coreRecover(data, v, r, s);
  }
}