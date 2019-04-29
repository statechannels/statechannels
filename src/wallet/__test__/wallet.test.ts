import Wallet from '..';
import { constructors as testDataConstructors, funded_channel } from '../../test/test_data';
import AllocatorChannel from '../models/allocatorChannel';
import { LedgerCommitment } from '../services/ledger-commitment';

process.env.NODE_ENV = 'test';

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
    const channel = await AllocatorChannel.query()
      .where({
        nonce: funded_channel.nonce,
      })
      .select('id')
      .first();
    const response = await wallet.formResponse(channel.id);
    expect(response.commitment.appAttributes).toEqual('0xf00d');
  });
});
