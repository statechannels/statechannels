import { Bytes, sign, Signature, toHex } from 'fmg-core';
import { bytesFromAppAttributes } from 'fmg-nitro-adjudicator';
import { HUB_PRIVATE_KEY } from '../../../constants';
import { constructors as testDataConstructors, funded_channel } from '../../../test/test_data';
import { seeds } from '../../db/seeds/2_allocator_channels_seed';
import AllocatorChannel from '../../models/allocatorChannel';
import * as ChannelManagement from '../channelManagement';
import { asCoreCommitment, LedgerCommitment } from '../ledger-commitment';

process.env.NODE_ENV = 'test';

let pre_fund_setup_0: LedgerCommitment;
let pre_fund_setup_1: LedgerCommitment;
let post_fund_setup_0: LedgerCommitment;
let post_fund_setup_1: LedgerCommitment;
let app_0: LedgerCommitment;
let hubSignature: Signature;

beforeEach(() => {
  pre_fund_setup_0 = testDataConstructors.pre_fund_setup(0);
  pre_fund_setup_1 = testDataConstructors.pre_fund_setup(1);

  post_fund_setup_0 = testDataConstructors.post_fund_setup(2);
  post_fund_setup_1 = testDataConstructors.post_fund_setup(3);
  app_0 = testDataConstructors.app(4, funded_channel);

  hubSignature = signAppCommitment(pre_fund_setup_1, HUB_PRIVATE_KEY);
});

function signAppCommitment(c: LedgerCommitment, k: Bytes): Signature {
  return sign(toHex(asCoreCommitment(c)), k);
}

describe('validSignature', () => {
  it('returns true when the commitment was signed by the mover', async () => {
    expect(ChannelManagement.validSignature(asCoreCommitment(pre_fund_setup_1), hubSignature)).toBe(
      true,
    );
  });

  it('returns false when the commitment was not signed by the mover', async () => {
    expect(ChannelManagement.validSignature(asCoreCommitment(pre_fund_setup_0), hubSignature)).toBe(
      false,
    );
  });

  it('returns false when the commitment was not signed by the mover', async () => {
    const signature = signAppCommitment(pre_fund_setup_0, '0xf00');
    expect(ChannelManagement.validSignature(asCoreCommitment(pre_fund_setup_0), signature)).toBe(
      false,
    );
  });
});

describe.skip('channelFunded', () => {
  it('works', () => {
    expect.assertions(1);
  });
});

describe('formResponse', () => {
  it('returns a signed core commitment', async () => {
    const { rules_address, nonce } = seeds.funded_channel;
    const channel = await AllocatorChannel.query()
      .where({ rules_address, nonce })
      .eager('commitments')
      .first();
    pre_fund_setup_1.channel = funded_channel;

    hubSignature = signAppCommitment(pre_fund_setup_1, HUB_PRIVATE_KEY);

    expect(await ChannelManagement.formResponse(channel.id, bytesFromAppAttributes)).toMatchObject({
      commitment: asCoreCommitment(pre_fund_setup_1),
      signature: hubSignature,
    });
  });
});

describe('nextCommitment', () => {
  it('works on preFundSetup commitments', () => {
    expect(ChannelManagement.nextCommitment(pre_fund_setup_0)).toMatchObject(pre_fund_setup_1);
  });

  it('works on postFundSetup commitments', () => {
    expect(ChannelManagement.nextCommitment(post_fund_setup_0)).toMatchObject(post_fund_setup_1);
  });

  it('throws on app commitments', () => {
    expect(() => ChannelManagement.nextCommitment(app_0)).toThrowError('CommitmentType.App');
  });

  it.skip('works on conclude commitments', () => {
    expect.assertions(1);
  });
});
