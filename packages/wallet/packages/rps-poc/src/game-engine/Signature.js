export class Signature {
    constructor({v, r, s}) {
        this.v = v;
        this.r = r;
        this.s = s;
    }

    toHex() {
        // TODO: These need to be padded to allow for deserialization
        return '0x' + this.v + this.r + this.s;
    }
}