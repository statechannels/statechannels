import {utils} from 'ethers';

export const WALLET_URL = process.env.WALLET_URL || 'https://wallet.statechannels.org';

export const FIREBASE_PREFIX = process.env.FIREBASE_PREFIX || 'default-prefix';
export const fireBaseConfig =
  process.env.NODE_ENV === 'test'
    ? undefined
    : {
        apiKey: process.env.FIREBASE_API_KEY,
        databaseURL: process.env.FIREBASE_URL,
      };

// todo: load the correct address
export const RPS_ADDRESS = process.env.RPS_CONTRACT_ADDRESS;

export const HUB = {
  signingAddress: '0xaaaa84838319627Fa056fC3FC29ab94d479B8502',
  outcomeAddress: '0xaaaa84838319627Fa056fC3FC29ab94d479B8502',
};

export const tenEth = utils.hexZeroPad(utils.parseEther('10').toHexString(), 32);
