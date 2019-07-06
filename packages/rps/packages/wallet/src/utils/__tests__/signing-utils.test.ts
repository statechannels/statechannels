import {
  signCommitment,
  signData,
  validSignature,
  validCommitmentSignature,
  signVerificationData,
} from '../../domain';
import {
  appCommitment,
  bsPrivateKey,
  asPrivateKey,
  asAddress,
} from '../../domain/commitments/__tests__';

describe('signing and validating commitments', () => {
  let commitmentSignature;

  it('should return true when a signature is valid', () => {
    commitmentSignature = signCommitment(appCommitment({ turnNum: 19 }).commitment, bsPrivateKey);
    expect(
      validCommitmentSignature(appCommitment({ turnNum: 19 }).commitment, commitmentSignature),
    ).toBe(true);
  });

  it('should return false when a signature is invalid', () => {
    expect(validCommitmentSignature(appCommitment({ turnNum: 19 }).commitment, '0x0')).toBe(false);
  });
});

describe('signing and validating arbitrary data', () => {
  const data = 'Some stuff to sign';
  let dataSignature;
  it('should sign some data', () => {
    dataSignature = signData(data, asPrivateKey);
  });
  it('should return true when a signature is valid', () => {
    expect(validSignature(data, dataSignature, asAddress)).toBe(true);
  });

  it('should return false when a signature is invalid', () => {
    expect(validSignature(data, '0x0', asAddress)).toBe(false);
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
