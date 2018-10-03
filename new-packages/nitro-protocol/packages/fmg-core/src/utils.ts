import Web3 from 'web3';
import { sha3 } from 'web3-utils';
import { Signature } from 'web3/eth/accounts';

export function toHex32(num) {
  return "0x" + toPaddedHexString(num, 64);
}

export function padBytes32(data){
  const l = 66-data.length;
  let x = data.substr(2, data.length);

  for(let i=0; i<l; i++) {
    x = 0 + x;
  }
  return '0x' + x;
}

// https://stackoverflow.com/a/42203200
export function toPaddedHexString(num, len) {
    const str = num.toString(16);
    return "0".repeat(len - str.length) + str;
}

export function sign(state: string, privateKey)
  : {v: string, r: string, s: string} {
  const localWeb3 = new Web3('');
  const account:any = localWeb3.eth.accounts.privateKeyToAccount(privateKey);
  const hash = sha3(state);
  return localWeb3.eth.accounts.sign(hash, account.privateKey, true) as Signature;
}

export function recover(data: string, v: string, r: string, s: string): string {
  const web3 = new Web3('');
  const hash = sha3(data);
  return web3.eth.accounts.recover(hash, v, r, s);
}