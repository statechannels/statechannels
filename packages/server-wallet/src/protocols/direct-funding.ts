import {right, none} from '../fp';

import {Protocol, ChannelData} from './state';

export const protocol: Protocol<ChannelData> = (_ps: ChannelData) => Promise.resolve(right(none));
