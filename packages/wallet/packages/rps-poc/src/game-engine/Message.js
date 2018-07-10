export class Message {
    constructor({state, signature}) {
        this.state = state;
        this.signature = signature;
    }

    toHex() {
        return '0x' + this.state.toHex().substr(2) + this.signature.toHex().substr(2);
    }
}