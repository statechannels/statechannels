import {WEI_PER_BYTE} from '../library/web3torrent-lib';

export const calculateWei = (fileSize: number | string) => {
  if (isNaN(Number(fileSize))) return 'unknown';
  return (
    WEI_PER_BYTE.mul(fileSize)
      .toNumber()
      .toString() + ' wei'
  );
};
