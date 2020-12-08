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

interface TestChannelArgs {
  aBal?: number;
  bBal?: number;
  channelNonce?: number;
  startClosingAt?: number;
}

/** A two-party channel between Alice and Bob, with state history. For testing purposes. */
export class TestChannel {
  public participantA: Participant = alice();
  public participantB: Participant = bob();

  public signingWalletA: SigningWallet = aliceWallet();
  public signingWalletB: SigningWallet = bobWallet();
  public startBals: [number, number];
  public channelNonce: number;
  public startClosingAt?: number;

  public get participants(): Participant[] {
    return [this.participantA, this.participantB];
  }
  public get signingWallets(): SigningWallet[] {
    return [this.signingWalletA, this.signingWalletB];
  }

  public static create(args: TestChannelArgs): TestChannel {
    return new TestChannel(args);
  }

  protected constructor(args: TestChannelArgs) {
    const {aBal, bBal, channelNonce, startClosingAt} = {aBal: 5, bBal: 5, channelNonce: 5, ...args};
    this.startBals = [aBal, bBal];
    this.channelNonce = channelNonce;
    this.startClosingAt = startClosingAt;
  }

  /**
   * Gives the nth state in the history, signed by the correct participant
   *
   * @param n - the index of the state in the history
   *
   * Note - in cases where participants double-sign the same states, n might _not_
   * be the turnNum
   */
  public state(n: number, bals?: [number, number]): State {
    return {
      ...this.channelConstants,
      appData: '0x',
      isFinal: !!this.startClosingAt && n >= this.startClosingAt,
      turnNum: Math.min(n, this.startClosingAt || n),
      outcome: bals ? this.toOutcome(bals) : this.startOutcome,
    };
  }

  public signedStateWithHash(n: number, bals?: [number, number]): SignedStateWithHash {
    return stateWithHashSignedBy([this.signingWallets[n % 2]])(this.state(n, bals));
  }

  /**
   * Gives the nth state in the history, signed by the correct participant
   */
  public wireState(n: number, bals?: [number, number]): WireState {
    return serializeState(this.signedStateWithHash(n, bals));
  }

  public wirePayload(n: number, bals?: [number, number]): Payload {
    return {
      walletVersion: WALLET_VERSION,
      signedStates: [this.wireState(n, bals)],
    };
  }

  public get startOutcome(): Outcome {
    return this.toOutcome(this.startBals);
  }

  public toOutcome([aBal, bBal]: [number, number]): Outcome {
    return simpleEthAllocation([
      {destination: this.participantA.destination, amount: BN.from(aBal)},
      {destination: this.participantB.destination, amount: BN.from(bBal)},
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

  public get openChannelPayload(): Payload {
    return {
      walletVersion: WALLET_VERSION,
      signedStates: [this.wireState(0)],
      objectives: [this.openChannelObjective],
    };
  }

  public get assetHolderAddress(): Address {
    return ETH_ASSET_HOLDER_ADDRESS;
  }

  public get getChannelRequest(): Payload {
    return {
      walletVersion: WALLET_VERSION,
      requests: [{channelId: this.channelId, type: 'GetChannel'}],
    };
  }

  static mergePayloads(payload1: Payload, payload2: Payload): Payload {
    return {
      walletVersion: payload1.walletVersion,
      signedStates: combineArrays(payload1.signedStates, payload2.signedStates),
      requests: combineArrays(payload1.requests, payload2.requests),
      objectives: combineArrays(payload1.objectives, payload2.objectives),
    };
  }

  static get emptyPayload(): Payload {
    return {walletVersion: WALLET_VERSION};
  }
}

function combineArrays<T>(a1: T[] | undefined, a2: T[] | undefined): T[] | undefined {
  const result = [...(a1 || []), ...(a2 || [])];
  if (result.length > 0) {
    return result;
  } else {
    return undefined;
  }
}
