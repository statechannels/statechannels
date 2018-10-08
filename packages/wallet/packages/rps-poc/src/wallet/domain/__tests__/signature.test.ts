import { Signature } from '../Signature';

it("can be constructed from a valid string", () => {
  const sig = '0xf595217e30fccfa7042b7e2b513d1e10873c13a3d5fa9595d7e3f9930445fa93077119a7f8905453631afee7c8176fa30bf6ce9c017cfee221f39a1d37a219081b';

  const signature = new Signature(sig);

  expect(signature.signature).toEqual(sig);
  expect(signature.r).toEqual('0xf595217e30fccfa7042b7e2b513d1e10873c13a3d5fa9595d7e3f9930445fa93');
  expect(signature.s).toEqual('0x077119a7f8905453631afee7c8176fa30bf6ce9c017cfee221f39a1d37a21908');
  expect(signature.v).toEqual(27);
});

describe('when the signature is not a hex strng', () => {
  it('raises "Invalid input: signature must be a hex string"', () => {
  const sig = 'f595217e30fccfa7042b7e2b513d1e10873c13a3d5fa9595d7e3f9930445fa93077119a7f8905453631afee7c8176fa30bf6ce9c017cfee221f39a1d37a219081';
  expect(() => new Signature(sig)).toThrow('Invalid input: signature must be a hex string');
  });
});

describe('when the signature is the incorrect length', () => {
  it('raises "Invalid input: signature must by 65 bytes"', () => {
  const sig = '0xf595217e30fccfa7042b7e2b513d1e10873c13a3d5fa9595d7e3f9930445fa93077119a7f8905453631afee7c8176fa30bf6ce9c017cfee221f39a1d37a219081';
  expect(() => new Signature(sig)).toThrow('Invalid input: signature must be 65 bytes');
  });
});