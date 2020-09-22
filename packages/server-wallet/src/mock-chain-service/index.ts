import {Address} from '@statechannels/client-api-schema';

import {Bytes32, Uint256} from '../type-aliases';

type SubmissionStatus = 'Success' | 'Fail';
type FundChannelArg = {
  channelId: Bytes32;
  assetHolderAddress: Address;
  expectedHeld: Uint256;
  amount: Uint256;
};
export class OnchainService {
  static fundChannel(_arg: FundChannelArg): Promise<SubmissionStatus> {
    const submissionStatus: SubmissionStatus = 'Success';
    return Promise.resolve(submissionStatus);
  }
}
