import {SharedObjective} from '@statechannels/wallet-core';

import {LedgerRequest} from '../../../models/ledger-request';
import {Store} from '../../store';

import {TestChannel} from './test-channel';

interface TestChannelArgs {
  aBal?: number;
  bBal?: number;
  channelNonce?: number;
}

/**
 * A two-party ledger channel between Alice and Bob, with state history.
 *
 * For testing purposes.
 * */
export class TestLedgerChannel extends TestChannel {
  public static create(args: TestChannelArgs): TestLedgerChannel {
    return new TestLedgerChannel(args);
  }

  private constructor(args: TestChannelArgs) {
    super(args);
  }

  public get openChannelObjective(): SharedObjective {
    return {
      participants: this.participants,
      type: 'OpenChannel',
      data: {
        role: 'ledger',
        targetChannelId: this.channelId,
        fundingStrategy: 'Direct',
      },
    };
  }

  public async insertFundingRequest(store: Store, channelToBeFunded: string): Promise<void> {
    return store.transaction(tx =>
      LedgerRequest.requestLedgerFunding(channelToBeFunded, this.channelId, tx)
    );
  }

  public async insertDefundingRequest(store: Store, channelToBeFunded: string): Promise<void> {
    return store.transaction(tx =>
      LedgerRequest.requestLedgerDefunding(channelToBeFunded, this.channelId, tx)
    );
  }
}
