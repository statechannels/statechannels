export class Signature {
    constructor({v, r, s}) {
        this.v = v;
        this.r = r;
        this.s = s;
    }

    toHex() {
        return '0x' + this.v + this.r + this.s;
    }
}