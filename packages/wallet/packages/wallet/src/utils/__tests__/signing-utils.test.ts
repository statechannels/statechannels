import * as scenarios from '../../redux/reducers/__tests__/test-scenarios';
import {
  signCommitment,
  signData,
  validSignature,
  validCommitmentSignature,
  signVerificationData,
} from '../signing-utils';

describe('signing and validating commitments', () => {
  let commitmentSignature;
  it('should sign a commitment', () => {
    commitmentSignature = signCommitment(scenarios.gameCommitment1, scenarios.asPrivateKey);
  });
  it('should return true when a signature is valid', () => {
    expect(
      validCommitmentSignature(scenarios.gameCommitment1, commitmentSignature, scenarios.asAddress),
    ).toBe(true);
  });

  it('should return false when a signature is invalid', () => {
    expect(validCommitmentSignature(scenarios.gameCommitment1, '0x0', scenarios.asAddress)).toBe(
      false,
    );
  });
});

describe('signing and validating arbitrary data', () => {
  const data = 'Some stuff to sign';
  let dataSignature;
  it('should sign some data', () => {
    dataSignature = signData(data, scenarios.asPrivateKey);
  });
  it('should return true when a signature is valid', () => {
    expect(validSignature(data, dataSignature, scenarios.asAddress)).toBe(true);
  });

  it('should return false when a signature is invalid', () => {
    expect(validSignature(data, '0x0', scenarios.asAddress)).toBe(false);
  });
});

it('should sign verification data', () => {
  const signature = signVerificationData(
    '0x5409ED021D9299bf6814279A6A1411A7e866A631',
    '0x5409ED021D9299bf6814279A6A1411A7e866A631',
    '0x6Ecbe1DB9EF729CBe972C83Fb886247691Fb6beb',
    '0x5409ED021D9299bf6814279A6A1411A7e866A631',
    '0xf2f48ee19680706196e2e339e5da3491186e0c4c5030670656b0e0164837257d',
  );
  // TODO: This isn't a great test since we can't really validate the signature
  expect(signature).toEqual(
    '0xe302f47c6405ed3675f218d9e8af355822555b61755da582f478cb689e6c89e40e83a14205696217a25f4935dfaa52218a02050d99b560ddaa23426a4af6a0461c',
  );
});
