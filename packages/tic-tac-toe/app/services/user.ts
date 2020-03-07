import Service from '@ember/service';
import {tracked} from '@glimmer/tracking';
import {inject as service} from '@ember/service';
import TttChannelClientService from './ttt-channel-client';

export default class UserService extends Service {
  @service tttChannelClient!: TttChannelClientService;
  @tracked walletAddress!: string;
  @tracked userAddress!: string;
  @tracked username!: string;

  public async initialize(username: string): Promise<void> {
    this.username = username;
    await this.requestAddresses();
  }

  private async requestAddresses(): Promise<void> {
    this.walletAddress = await this.tttChannelClient.getAddress();
    this.userAddress = await this.tttChannelClient.getEthereumSelectedAddress();
  }
}

// DO NOT DELETE: this is how TypeScript knows how to look up your services.
declare module '@ember/service' {
  interface Registry {
    user: UserService;
  }
}
