// TODO: Why do we need these things in src?
export const ETH_TOKEN = '0x0000000000000000000000000000000000000000';
export const MOCK_TOKEN = '0x1000000000000000000000000000000000000001'; // Use in serde test
export const MOCK_ASSET_HOLDER_ADDRESS = '0x1111111111111111111111111111111111111111';

// TODO: Use getEnvBool from devtools once working
export function getBool(val: string | undefined): boolean {
  switch (val) {
    case undefined:
    case null:
    case 'null':
    case 'false':
    case 'FALSE':
    case '0':
      return false;
    default:
      return true;
  }
}
