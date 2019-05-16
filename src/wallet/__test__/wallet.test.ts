import Wallet from '..';
import { constructors as testDataConstructors, funded_channel_id } from '../../test/test_data';
import { getWithCommitments } from '../db/queries/allocator_channels';
import { LedgerCommitment } from '../services/ledger-commitment';

let pre_fund_setup_0: LedgerCommitment;

beforeEach(() => {
  pre_fund_setup_0 = testDataConstructors.pre_fund_setup(0);
});

describe('sanitize', () => {
  it('sanitizes application attributes with the sanitize method it was passed', async () => {
    const wallet = new Wallet(() => '0xf00');
    expect(wallet.sanitize(pre_fund_setup_0.appAttributes)).toEqual('0xf00');
  });
});

describe('formResponse', () => {
  it('sanitizes application attributes with the sanitize method it was passed', async () => {
    const wallet = new Wallet(() => '0xf00d');
    const channel = await getWithCommitments(funded_channel_id);
    const commitment = channel.commitments[1];
    const response = await wallet.formResponse(commitment);
    expect(response.commitment.appAttributes).toEqual('0xf00d');
  });
});
