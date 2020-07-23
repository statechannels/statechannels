import {ErrorCode} from './types';
export {ChannelResult} from '@statechannels/client-api-schema';

export {UnsubscribeFunction, TokenAllocations} from './types';
export {ChannelClient} from './channel-client';
export {FakeBrowserChannelProvider} from '../tests/fakes/fake-browser-channel-provider';

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
