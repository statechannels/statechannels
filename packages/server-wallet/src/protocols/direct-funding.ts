import {right, none} from '../fp';

import {Protocol, ChannelState} from './state';

export const protocol: Protocol<ChannelState> = (_ps: ChannelState) => Promise.resolve(right(none));
