import {none, right} from '../fp';

import {Protocol, ChannelState} from './state';

export const protocol: Protocol<ChannelState> = () => Promise.resolve(right(none));
