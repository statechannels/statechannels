import {utils} from 'ethers';
import prettier from 'prettier-bytes';
import {WEI_PER_BYTE} from '../constants';

export const calculateWei = (fileSize: number | string) => {
  if (!isNaN(Number(fileSize))) {
    return WEI_PER_BYTE.mul(fileSize);
  } else return utils.bigNumberify(NaN);
};

export const prettyPrintBytes = (wei: utils.BigNumber): string => {
  const bytes = wei.div(WEI_PER_BYTE);
  return prettier(bytes.toNumber());
};

export const prettyPrintWei = (wei: utils.BigNumber): string => {
  const names = ['wei', 'kwei', 'Mwei', 'Gwei', 'szabo', 'finney', 'ether'];
  const decimals = [0, 3, 6, 9, 12, 15, 18];
  if (!wei) {
    return 'unknown';
  } else if (wei.eq(utils.bigNumberify(0))) {
    return '0 wei';
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
