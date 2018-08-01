export default class Message {
  constructor({ state, signature, hexMessage }) {
    if (hexMessage) {
      hexMessage = hexMessage.substr(2)
      state = '0x' + hexMessage.substr(0, hexMessage.length - 130);
      signature = '0x' + hexMessage.substr(hexMessage.length - 130);
    }

    this.state = state;
    this.signature = signature;
  }

  toHex() {
    return '0x' + this.state.substr(2) + this.signature.substr(2);
  }
}
