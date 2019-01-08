import { splitSignature } from 'ethers/utils';
import { recover, sign, SolidityType } from 'fmg-core';


export const validSignature = (data: string, signature: string, address: string) => {
  try {
    const { v: vNum, r, s } = splitSignature(signature);
    const v = '0x' + (vNum as number).toString(16);

    const recovered = recover(data, v, r, s);

    return recovered === address;
  } catch (err) {

    return false;
  }
};

export const signPositionHex = (positionHex: string, privateKey: string) => {
  const signature = sign(positionHex, privateKey) as any;
  return signature.signature;
};

export const signVerificationData = (playerAddress: string, destination: string, channelId: string, privateKey) => {
  const data = [
    { type: SolidityType.address, value: playerAddress },
    { type: SolidityType.address, value: destination },
    { type: SolidityType.bytes32, value: channelId },
  ];
  const signature = sign(data, privateKey) as any;
  return signature.signature;
};