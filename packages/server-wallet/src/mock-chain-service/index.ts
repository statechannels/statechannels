import {Address} from '@statechannels/client-api-schema';
import {Evt} from 'evt';

import {Bytes32, Uint256} from '../type-aliases';
import {
  OnchainServiceInterface,
  ChainEventNames,
  ChannelEventRecordMap,
  FundingEvent,
} from '../onchain-service';
import {Wallet} from '../wallet';

type SubmissionStatus = 'Success' | 'Fail';
type FundChannelArg = {
  channelId: Bytes32;
  assetHolderAddress: Address;
  expectedHeld: Uint256;
  amount: Uint256;
};
export type SetFundingArg = {
  channelId: Bytes32;
  assetHolderAddress: Address;
  amount: Uint256;
};

export interface ChainEventListener {
  setFunding(arg: SetFundingArg): void;
}
export class OnchainService implements OnchainServiceInterface {
  static fundChannel(_arg: FundChannelArg): Promise<SubmissionStatus> {
    const submissionStatus: SubmissionStatus = 'Success';
    return Promise.resolve(submissionStatus);
  }

  registerChannel(_channelId: Bytes32, _assetHolders: Address[]): Promise<void> {
    return Promise.resolve();
  }

  // TODO: remove in v1
  attachChannelWallet(_wallet: Wallet): void {
    return;
  }

  attachHandler<T extends ChainEventNames>(
    _assetHolderAddr: Address,
    _event: T,
    _callback: (event: ChannelEventRecordMap[T]) => void | Promise<void>,
    _filter?: (event: ChannelEventRecordMap[T]) => boolean,
    _timeout?: number
  ): Evt<ChannelEventRecordMap[T]> | Promise<ChannelEventRecordMap[T]> {
    const mockEvt = new Evt<FundingEvent>();
    return mockEvt;
  }

  detachAllHandlers(_assetHolderAddr: Address, _event?: ChainEventNames): void {
    return;
  }
}
