import Web3 from 'web3';

export default class ChannelWallet {
  account: any; // todo: figure out how to do types with web3
  constructor(privateKey?: string) {
    const web3 = new Web3('');
    if (privateKey) {
      this.account = web3.eth.accounts.privateKeyToAccount(privateKey);
    } else {
      this.account = web3.eth.accounts.create();
    }
  }

  get address() {
    return this.account.address;
  }

  get privateKey() {
    return this.account.privateKey;
  }

  sign(stateString: string): string {
    return this.account.sign(stateString).signature;

  }

  recover(data: string, signature: string) {
    const web3 = new Web3('');
    return web3.eth.accounts.recover(data, signature);
  }
}
