import {ErrorCode} from './types';
export {ChannelResult} from '@statechannels/client-api-schema';

export {ChannelClientInterface, UnsubscribeFunction} from './types';
export {ChannelClient} from './channel-client';
export {FakeBrowserChannelProvider} from '../tests/fakes/fake-browser-channel-provider';

const UserDeclinedErrorCode = ErrorCode.CloseAndWithdraw.UserDeclined;
const EthereumNotEnabledErrorCode = ErrorCode.EnableEthereum.EthereumNotEnabled;
export {EthereumNotEnabledErrorCode, UserDeclinedErrorCode};
export {ErrorCode} from './types';
