import {
  WalletJsonRpcAPI,
  IFrameChannelProviderInterface
} from '@statechannels/iframe-channel-provider';
import {
  ApproveBudgetAndFundParams,
  CloseAndWithdrawParams,
  GetBudgetParams,
  DomainBudget
} from '@statechannels/client-api-schema';

import {FakeChannelProvider} from './fake-channel-provider';

const mockDomainBudget = {
  hubAddress: 'mock.hub.com',
  domain: 'mock.web3torrent.com',
  budgets: [
    {
      token: '0x0',
      availableReceiveCapacity: '0x5000000',
      availableSendCapacity: '0x3000000',
      channels: []
    }
  ]
};

/**
 * Extension of FakeChannelProvider which adds support for browser-specific wallet API
 * methods such as EnableEthereum and ApproveBudgetAndFund. Also, exposes the browser
 * specific provider method enable() (i.e., for MetaMask approval).
 */

/**
 * @beta
 */
export class FakeBrowserChannelProvider extends FakeChannelProvider
  implements IFrameChannelProviderInterface {
  budget: DomainBudget = mockDomainBudget;

  async mountWalletComponent(url?: string): Promise<void> {
    this.url = url || '';
    this.signingAddress = this.getAddress();
    this.walletVersion = 'FakeChannelProvider@VersionTBD';
    this.destinationAddress = '0xEthereumAddress';
  }

  async enable(): Promise<void> {
    const {signingAddress, destinationAddress, walletVersion} = await this.send(
      'EnableEthereum',
      {}
    );
    this.signingAddress = signingAddress;
    this.destinationAddress = destinationAddress;
    this.walletVersion = walletVersion;
  }

  async send<M extends keyof WalletJsonRpcAPI>(
    method: M,
    params: WalletJsonRpcAPI[M]['request']['params']
  ): Promise<WalletJsonRpcAPI[M]['response']['result']> {
    switch (method) {
      case 'EnableEthereum':
        return {
          signingAddress: this.getAddress(),
          destinationAddress: '0xEthereumAddress',
          walletVersion: 'FakeChannelProvider@VersionTBD'
        };

      case 'ApproveBudgetAndFund':
        return this.approveBudgetAndFund(params as ApproveBudgetAndFundParams);

      case 'CloseAndWithdraw':
        return this.closeAndWithdraw(params as CloseAndWithdrawParams);

      case 'GetBudget':
        return this.getBudget(params as GetBudgetParams);

      default:
        return super.send(method, params);
    }
  }

  notifyAppBudgetUpdated(data: DomainBudget): void {
    this.events.emit('BudgetUpdated', data);
  }

  async approveBudgetAndFund(params: ApproveBudgetAndFundParams): Promise<DomainBudget> {
    // TODO: Does this need to be delayed?
    this.budget = {
      hubAddress: params.hub.signingAddress,
      domain: 'localhost',
      budgets: [
        {
          token: '0x0',
          availableReceiveCapacity: params.requestedReceiveCapacity,
          availableSendCapacity: params.requestedSendCapacity,
          channels: []
        }
      ]
    };

    this.notifyAppBudgetUpdated(this.budget);

    return this.budget;
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async closeAndWithdraw(_params: CloseAndWithdrawParams): Promise<{success: boolean}> {
    // TODO: Implement a fake implementation
    return {success: true};
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async getBudget(_params: GetBudgetParams): Promise<DomainBudget> {
    return this.budget;
  }
}
