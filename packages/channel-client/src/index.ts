import {ErrorCode} from './types';
export {ChannelResult} from '@statechannels/client-api-schema';

export {UnsubscribeFunction, TokenAllocations} from './types';
export {ChannelClient} from './channel-client';
export {FakeChannelProvider} from '../tests/fakes/fake-channel-provider';

/**
 * @beta
 */
const UserDeclinedErrorCode = ErrorCode.CloseAndWithdraw.UserDeclined;
/**
 * @beta
 */
const EthereumNotEnabledErrorCode = ErrorCode.EnableEthereum.EthereumNotEnabled;

export {EthereumNotEnabledErrorCode, UserDeclinedErrorCode};
export {ErrorCode} from './types';
