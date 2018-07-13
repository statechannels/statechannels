import { Message } from './Message';
import Web3 from 'web3';

export default class ChannelWallet {
    constructor() {
        let web3 = new Web3('');
        this.account = web3.eth.accounts.create();
    }

    get address() {
        return this.account.address;
    }

    sign(state) {
        let signature = this.account.sign(state).signature;
        return new Message({ state, signature });
    }
}