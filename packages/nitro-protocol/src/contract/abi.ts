import {utils} from 'ethers';
import abi from 'ethereumjs-abi';

export const fastEncode = abi.rawEncode;
export const fastDecode = abi.rawDecode;

export const encode = utils.defaultAbiCoder.encode.bind(utils.defaultAbiCoder);
export const decode = utils.defaultAbiCoder.decode.bind(utils.defaultAbiCoder);
