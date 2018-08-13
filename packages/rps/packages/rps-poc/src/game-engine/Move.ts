export default class Move {
   static fromHex(hexString) {
    const length = hexString.length;
    const state = '0x' + hexString.substr(2, length - 130 - 2);
    const signature = '0x' + hexString.substr(length - 130);

    return new Move(state, signature);
  }

  state: string;
  signature: string;

  constructor(state, signature) {
    this.state = state;
    this.signature = signature;
  }

  toHex() {
    return '0x' + this.state.substr(2) + this.signature.substr(2);
  }
}
