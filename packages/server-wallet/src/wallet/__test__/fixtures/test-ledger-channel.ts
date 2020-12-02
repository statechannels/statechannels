import {Objective} from '@statechannels/wallet-core';

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

  public get openChannelObjective(): Objective {
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

  public async insertIntoStore(store: Store): Promise<void> {
    await store.addSigningKey(this.signingKeyA);
    // The only way the store currently knows the channel is a ledger is by the role
    // passed in on the OpenChannel objective. So we need to push in that objective,
    // and then approve it.
    await store.pushMessage(this.openChannelPayload);
    const objectives = await store.getObjectives([this.channelId]);
    if (objectives.length !== 1) {
      throw Error(`TestLedgerChannel expected 1 objective. Found ${objectives.length}`);
    }
    await store.approveObjective(objectives[0].objectiveId);
  }
}
