import _ from 'lodash';
import {
  BN,
  ChannelConstants,
  Destination,
  makeAddress,
  OpenChannel,
} from '@statechannels/wallet-core';
import {utils} from 'ethers';
import {Payload} from '@statechannels/wire-format';

import {defaultTestConfig} from '../../../config';
import {
  LedgerRequest,
  LedgerRequestStatus,
  RichLedgerRequest,
} from '../../../models/ledger-request';
import {WALLET_VERSION} from '../../../version';
import {Store} from '../../store';

import {TestChannel, Bals, SignedBy} from './test-channel';

interface TestChannelArgs {
  aBal?: number;
  bBal?: number;
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

  public get openChannelObjective(): OpenChannel {
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

  public get isLedger(): boolean {
    return true;
  }

  // Override appDefinition to indicate a ledger channel
  public get channelConstants(): ChannelConstants {
    return {
      appDefinition: makeAddress('0x0000000000000000000000000000000000000000'),
      participants: this.participants,
      channelNonce: this.channelNonce,
      chainId: utils.hexlify(defaultTestConfig().networkConfiguration.chainNetworkID),
      challengeDuration: 9001,
    };
  }

  /**
   * Gives the nth state in the history, signed by the provided participant(s) -- default is both
   */
  public wirePayload(n: number, bals?: Bals, signedBy?: SignedBy): Payload {
    return {
      walletVersion: WALLET_VERSION,
      signedStates: [this.wireState(n, bals, _.isUndefined(signedBy) ? 'both' : signedBy)],
    };
  }

  public async insertFundingRequest(
    store: Store,
    {channelToBeFunded, amtA, amtB, status, missedOps, lastSeen}: RequestParams
  ): Promise<RichLedgerRequest> {
    return LedgerRequest.setRequest(
      {
        ledgerChannelId: this.channelId,
        type: 'fund',
        channelToBeFunded,
        amountA: BN.from(amtA),
        amountB: BN.from(amtB),
        status,
        missedOpportunityCount: missedOps || 0,
        lastSeenAgreedState: lastSeen || null,
      },
      store.knex
    );
  }

  public async insertDefundingRequest(
    store: Store,
    {channelToBeFunded, amtA, amtB, status, missedOps, lastSeen}: RequestParams
  ): Promise<RichLedgerRequest> {
    return LedgerRequest.setRequest(
      {
        ledgerChannelId: this.channelId,
        type: 'defund',
        channelToBeFunded,
        amountA: BN.from(amtA),
        amountB: BN.from(amtB),
        status,
        missedOpportunityCount: missedOps || 0,
        lastSeenAgreedState: lastSeen || null,
      },
      store.knex
    );
  }
}

interface RequestParams {
  channelToBeFunded: Destination;
  amtA: number;
  amtB: number;
  status: LedgerRequestStatus;
  missedOps?: number;
  lastSeen?: number;
}
