import {makeAddress} from './types';

export const MOCK_ASSET_HOLDER_ADDRESS = makeAddress('0x1111111111111111111111111111111111111111');

export const CONCLUDE_TIMEOUT = 30_000;

// A null app can specify any app data: it will never be interpreted by the chain.
// It is most efficient, therefore, to use the shortest possible bytes
export const NULL_APP_DATA = '0x'; // This is the hex string representation of zero-length bytes
