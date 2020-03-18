import {WEI_PER_BYTE} from '../library/web3torrent-lib';
import {utils} from 'ethers';

export const calculateWei = (fileSize: number | string) => {
  if (!isNaN(Number(fileSize))) {
    return WEI_PER_BYTE.mul(fileSize);
  } else return utils.bigNumberify(NaN);
};

export const prettyPrintWei = (wei: utils.BigNumber): string => {
  const names = ['wei', 'kwei', 'Mwei', 'Gwei', 'szabo', 'finney', 'ether'];
  const decimals = [0, 3, 6, 9, 12, 15, 18];
  if (!wei) {
    return 'unknown';
  } else {
    let formattedString;
    decimals.forEach((decimal, index, array) => {
      if (wei.gte(utils.bigNumberify(10).pow(decimal))) {
        formattedString =
          wei.div(utils.bigNumberify(10).pow(decimal)).toNumber() +
          '.' +
          wei
            .mod(utils.bigNumberify(10).pow(decimal))
            .div(utils.bigNumberify(10).pow(decimal - 1)) // TODO: this doesn't do rounding properly
            .toNumber() +
          ' ' +
          names[index];
      }
    });
    return formattedString;
  }
};
