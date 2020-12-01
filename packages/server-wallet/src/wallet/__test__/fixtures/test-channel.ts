import {
  Address,
  BN,
  calculateChannelId,
  ChannelConstants,
  makeAddress,
  makePrivateKey,
  Objective,
  Outcome,
  Participant,
  PrivateKey,
  serializeState,
  SignedStateWithHash,
  simpleEthAllocation,
  State,
} from '@statechannels/wallet-core';
import {ETH_ASSET_HOLDER_ADDRESS} from '@statechannels/wallet-core/lib/src/config';
import {SignedState as WireState, Payload} from '@statechannels/wire-format';

import {SigningWallet} from '../../../models/signing-wallet';
import {WALLET_VERSION} from '../../../version';

import {alice, bob} from './participants';
import {alice as aliceWallet, bob as bobWallet} from './signing-wallets';
import {stateWithHashSignedBy} from './states';

/** A two-party channel between Alice and Bob, with state history. For testing purposes. */
export class TestChannel {
  public participantA: Participant = alice();
  public participantB: Participant = bob();

  public signingWalletA: SigningWallet = aliceWallet();
  public signingWalletB: SigningWallet = bobWallet();
  public startBals: [number, number];
  public channelNonce = 5;

  public get participants(): Participant[] {
    return [this.participantA, this.participantB];
  }
  public get signingWallets(): SigningWallet[] {
    return [this.signingWalletA, this.signingWalletB];
  }

  public static create(aBal: number, bBal: number): TestChannel {
    return new TestChannel(aBal, bBal);
  }

  private constructor(aBal: number, bBal: number) {
    this.startBals = [aBal, bBal];
  }

  /**
   * Gives the nth state in the history, signed by the correct participant
   *
   * @param n - the index of the state in the history
   *
   * Note - in cases where participants double-sign the same states, n might _not_
   * be the turnNum
   */
  public state(n: number): State {
    return {
      ...this.channelConstants,
      appData: '0x',
      isFinal: false,
      turnNum: n,
      outcome: this.startOutcome,
    };
  }

  public signedStateWithHash(n: number): SignedStateWithHash {
    return stateWithHashSignedBy([this.signingWallets[n % 2]])(this.state(n));
  }

  /**
   * Gives the nth state in the history, signed by the correct participant
   */
  public wireState(n: number): WireState {
    return serializeState(this.signedStateWithHash(n));
  }

  public wirePayload(n: number): Payload {
    return {
      walletVersion: WALLET_VERSION,
      signedStates: [this.wireState(n)],
    };
  }

  public get startOutcome(): Outcome {
    return simpleEthAllocation([
      {destination: this.participantA.destination, amount: BN.from(this.startBals[0])},
      {destination: this.participantB.destination, amount: BN.from(this.startBals[1])},
    ]);
  }

  public get signingKeyA(): PrivateKey {
    return makePrivateKey(this.signingWalletA.privateKey);
  }

  public get signingKeyB(): PrivateKey {
    return makePrivateKey(this.signingWalletB.privateKey);
  }

  public get signingKeys(): PrivateKey[] {
    return [this.signingKeyA, this.signingKeyB];
  }

  public get channelConstants(): ChannelConstants {
    return {
      appDefinition: makeAddress('0x0000000000000000000000000000000000000000'),
      participants: this.participants,
      channelNonce: this.channelNonce,
      chainId: '0x01',
      challengeDuration: 9001,
    };
  }

  public get channelId(): string {
    return calculateChannelId(this.channelConstants);
  }

  public get openChannelObjective(): Objective {
    return {
      participants: this.participants,
      type: 'OpenChannel',
      data: {
        targetChannelId: this.channelId,
        fundingStrategy: 'Direct',
      },
    };
  }

  public get assetHolderAddress(): Address {
    return ETH_ASSET_HOLDER_ADDRESS;
  }
}
