import {
  Address,
  ChannelConstants,
  makeAddress,
  OpenChannel,
  serializeState,
  SignedStateWithHash,
  SimpleAllocation,
} from '@statechannels/wallet-core';
import {Payload, SignedState as WireState} from '@statechannels/wire-format';
import {utils} from 'ethers';

import {Channel} from '../../../models/channel';
import {defaultTestConfig} from '../../../config';
import {LedgerProposal} from '../../../models/ledger-proposal';
import {LedgerRequest} from '../../../models/ledger-request';
import {WalletObjective} from '../../../models/objective';
import {WALLET_VERSION} from '../../../version';
import {Store} from '../../store';

import {stateWithHashSignedBy} from './states';
import {TestChannel, Bals, InsertionParams} from './test-channel';

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
  public wirePayload(n: number, bals?: Bals, signerIndices: number[] = [n % 1, n % 2]): Payload {
    return {
      walletVersion: WALLET_VERSION,
      signedStates: [this.wireState(n, bals, signerIndices)],
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

  /**
   * Calls addSigningKey, pushMessage, updateFunding, and adds the OpenChannel Objective to the supplied store.
   * Also makes the required patches to indicate this channel is a ledger channel
   */
  public async insertInto(
    store: Store,
    args: InsertionParams = {}
  ): Promise<WalletObjective<OpenChannel>> {
    const objective = await super.insertInto(store, args);
    await Channel.setLedger(this.channelId, this.startOutcome.assetHolderAddress, store.knex);
    const {fundingStrategy, fundingLedgerChannelId} = objective.data;
    await Channel.query(store.knex)
      .where({channelId: this.channelId})
      .patch({fundingStrategy, fundingLedgerChannelId});
    return objective;
  }
}
