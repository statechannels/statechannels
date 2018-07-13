export class Message {
    constructor({state, signature}) {
        this.state = state;
        this.signature = signature;
    }

    toHex() {
        return '0x' + this.state.substr(2) + this.signature.substr(2);
    }
}