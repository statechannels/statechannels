import {keccak256} from 'ethereumjs-util';

import {Bytes32} from './contract/types';
export function hash(value: string): Bytes32 {
  return '0x' + keccak256(value).toString('hex');
}
