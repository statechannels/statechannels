import {providers, constants} from 'ethers';
import {Address, SignedState} from '@statechannels/wallet-core';
import {
  ChainServiceInterface,
  ChainEventSubscriberInterface,
  FundChannelArg,
} from '@statechannels/chain-service';

import {Bytes32} from '../type-aliases';

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

  async fetchBytecode(_appDefinition: string): Promise<string> {
    return '0x0';
  }

  destructor(): void {
    return;
  }
}
