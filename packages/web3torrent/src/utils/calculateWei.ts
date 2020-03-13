import {WEI_PER_BYTE} from '../library/web3torrent-lib';
import {utils} from 'ethers';

export const calculateWei = (fileSize: number | string) => {
  if (!isNaN(Number(fileSize))) {
    return WEI_PER_BYTE.mul(fileSize);
  } else return utils.bigNumberify(NaN);
};

export const prettyPrintWei = (wei: utils.BigNumber): string => {
  const names = ['kwei', 'Mwei', 'Gwei', 'szabo', 'finney', 'ether'];
  const decimals = [3, 6, 9, 12, 15, 18];
  if (!wei) {
    return 'unknown';
  } else {
    let formattedString = utils.formatUnits(wei, 'wei') + ' ' + 'wei';
    decimals.forEach((decimal, index, array) => {
      if (wei.gte(utils.bigNumberify(10).pow(decimal))) {
        formattedString =
          wei
            .div(utils.bigNumberify(10).pow(decimal))
            .toNumber()
            .toFixed(1)
            .toString() +
          ' ' +
          names[index];
      }
    });
    return formattedString;
  }
};
