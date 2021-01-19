import {
  Address,
  ChannelConstants,
  makeAddress,
  serializeState,
  SharedObjective,
  SignedStateWithHash,
  SimpleAllocation,
} from '@statechannels/wallet-core';
import {SignedState as WireState} from '@statechannels/wire-format';

import {LedgerProposal} from '../../../models/ledger-proposal';
import {LedgerRequest} from '../../../models/ledger-request';
import {Store} from '../../store';

import {stateWithHashSignedBy} from './states';
import {TestChannel, Bals} from './test-channel';

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

  // Override appDefinition to indicate a ledger channel
  public get channelConstants(): ChannelConstants {
    return {
      appDefinition: makeAddress('0x0000000000000000000000000000000000000000'),
      participants: this.participants,
      channelNonce: this.channelNonce,
      chainId: '0x01',
      challengeDuration: 9001,
    };
  }

  /**
   * Gives the nth state in the history, signed by the provided participant(s) -- default is both
   */
  public wireState(n: number, bals?: Bals, signerIndices: number[] = [n % 1, n % 2]): WireState {
    return serializeState(this.signedStateWithHash(n, bals, signerIndices));
  }

  /**
   * Gives the nth state in the history, signed by the provided participant(s) -- default is both
   */
  public signedStateWithHash(
    n: number,
    bals?: Bals,
    signerIndices: number[] = [n % 2]
  ): SignedStateWithHash {
    return stateWithHashSignedBy(signerIndices.map(i => this.signingWallets[i]))(
      this.state(n, bals)
    );
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

  public async insertProposal(
    store: Store,
    proposal: SimpleAllocation,
    signingAddress: Address,
    nonce: number
  ): Promise<void> {
    return store.transaction(tx =>
      LedgerProposal.storeProposal({channelId: this.channelId, signingAddress, proposal, nonce}, tx)
    );
  }
}
