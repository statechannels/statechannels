import {State} from '@statechannels/nitro-protocol';
import {signState} from '@statechannels/nitro-protocol/lib/src/signatures';
import {Signature} from 'ethers/utils';
import {HUB_PRIVATE_KEY} from '../../../constants';
import {constructors as testDataConstructors, funded_channel} from '../../../test/test_data';
import * as ChannelManagement from '../channelManagement';

let pre_fund_setup_0: State;
let pre_fund_setup_1: State;
let post_fund_setup_0: State;
let post_fund_setup_1: State;
let hubSignature: Signature;

beforeEach(() => {
  pre_fund_setup_0 = testDataConstructors.pre_fund_setup(0);
  pre_fund_setup_1 = testDataConstructors.pre_fund_setup(1);

  post_fund_setup_0 = testDataConstructors.post_fund_setup(2);
  post_fund_setup_1 = testDataConstructors.post_fund_setup(3);

  hubSignature = signState(pre_fund_setup_1, HUB_PRIVATE_KEY).signature;
});

describe('validSignature', () => {
  it('returns true when the state was signed by the mover', async () => {
    expect(ChannelManagement.validSignature(pre_fund_setup_1, hubSignature)).toBe(true);
  });

  it.skip('returns false when the state was not signed by the mover', async () => {
    // TODO: Unskip when validation is enabled
    expect(ChannelManagement.validSignature(pre_fund_setup_0, hubSignature)).toBe(false);
  });

  it.skip('returns false when the state was not signed by the mover', async () => {
    // TODO: Unskip when validation is enabled
    const signature = signState(pre_fund_setup_0, '0xf00').signature;
    expect(ChannelManagement.validSignature(pre_fund_setup_0, signature)).toBe(false);
  });
});

describe('formResponse', () => {
  it('returns a signed core state', async () => {
    pre_fund_setup_1.channel = funded_channel;

    hubSignature = signState(pre_fund_setup_1, HUB_PRIVATE_KEY).signature;

    expect(await ChannelManagement.formResponse(pre_fund_setup_1)).toMatchObject({
      state: pre_fund_setup_1,
      signature: hubSignature
    });
  });
});

describe('nextState', () => {
  it('works on preFundSetup states', () => {
    expect(ChannelManagement.nextState(pre_fund_setup_0)).toMatchObject(pre_fund_setup_1);
  });

  it('works on postFundSetup states', () => {
    expect(ChannelManagement.nextState(post_fund_setup_0)).toMatchObject(post_fund_setup_1);
  });
});
