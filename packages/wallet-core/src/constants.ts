import {makeAddress} from './types';

// TODO: Why do we need these things in src?
export const ETH_TOKEN = makeAddress('0x0000000000000000000000000000000000000000');
export const MOCK_TOKEN = makeAddress('0x1000000000000000000000000000000000000001'); // Use in serde test
export const MOCK_ASSET_HOLDER_ADDRESS = makeAddress('0x1111111111111111111111111111111111111111');

export const CONCLUDE_TIMEOUT = 30_000;
