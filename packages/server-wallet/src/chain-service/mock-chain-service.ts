import {providers, constants} from 'ethers';
import {Address, PrivateKey, SignedState, State, unreachable} from '@statechannels/wallet-core';

import {Bytes32} from '../type-aliases';

import {
  ChainEventSubscriberInterface,
  ChainRequest,
  ChainServiceInterface,
  FundChannelArg,
} from './';

const mockTransactionReceipt: providers.TransactionReceipt = {
  to: '',
  from: '',
  contractAddress: '',
  transactionIndex: 0,
  gasUsed: constants.Zero,
  logsBloom: '',
  blockHash: '',
  transactionHash: '',
  logs: [],
  blockNumber: 0,
  confirmations: 0,
  cumulativeGasUsed: constants.Zero,
  byzantium: false,
};

const mockTransactoinResponse: providers.TransactionResponse = {
  hash: '',
  confirmations: 0,
  from: '',
  wait: (_confirmations?: number): Promise<providers.TransactionReceipt> =>
    Promise.resolve(mockTransactionReceipt),
  nonce: 0,
  gasLimit: constants.Zero,
  gasPrice: constants.Zero,
  data: '',
  value: constants.Zero,
  chainId: 0,
};

export class MockChainService implements ChainServiceInterface {
  public async handleChainRequests(
    chainRequests: ChainRequest[]
  ): Promise<providers.TransactionResponse[]> {
    const responses = Array(chainRequests.length);
    for (const chainRequest of chainRequests) {
      switch (chainRequest.type) {
        case 'Challenge':
          responses.push(
            await this.challenge(chainRequest.challengeStates, chainRequest.privateKey)
          );
          break;
        case 'ConcludeAndWithdraw':
          responses.push(await this.concludeAndWithdraw(chainRequest.finalizationProof));
          break;
        case 'FundChannel':
          responses.push(await this.fundChannel(chainRequest));
          break;
        case 'Withdraw':
          responses.push(await this.withdraw(chainRequest.state));
          break;
        default:
          unreachable(chainRequest);
      }
    }
    return responses;
  }
  async checkChainId(_networkChainId: number): Promise<void> {
    // noop, a mock chain service will have the "correct" chain id
  }

  fundChannel(_arg: FundChannelArg): Promise<providers.TransactionResponse> {
    return Promise.resolve(mockTransactoinResponse);
  }

  registerChannel(
    _channelId: Bytes32,
    _assetHolders: Address[],
    _subscriber: ChainEventSubscriberInterface
  ): void {
    return;
  }

  unregisterChannel(_channelId: Bytes32): void {
    return;
  }

  concludeAndWithdraw(_finalizationProof: SignedState[]): Promise<providers.TransactionResponse> {
    return Promise.resolve(mockTransactoinResponse);
  }

  withdraw(_state: State): Promise<providers.TransactionResponse> {
    return Promise.resolve(mockTransactoinResponse);
  }

  challenge(
    _challengeStates: SignedState[],
    _privateKey: PrivateKey
  ): Promise<providers.TransactionResponse> {
    return Promise.resolve(mockTransactoinResponse);
  }

  async fetchBytecode(_appDefinition: string): Promise<string> {
    return '0x0';
  }

  destructor(): void {
    return;
  }
}
export class ErorringMockChainService extends MockChainService {
  pushOutcomeAndWithdraw(
    _state: State,
    _challengerAddress: Address
  ): Promise<providers.TransactionResponse> {
    throw new Error('Failed to submit transaction');
  }
}
