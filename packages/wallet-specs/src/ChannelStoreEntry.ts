import { Channel, getChannelId, State } from '@statechannels/nitro-protocol';
import { ethers } from 'ethers';
import _ from 'lodash';
import { getStateSignerAddress } from '@statechannels/nitro-protocol/lib/src/signatures';

import { Participant, Store } from './store';
import { store } from './temp-store';

import { SignedState } from '.';

interface DirectFunding {
  type: 'Direct';
}

interface IndirectFunding {
  type: 'Indirect';
  ledgerId: string;
}

interface VirtualFunding {
  type: 'Virtual';
  jointChannelId: string;
  guarantorChannelId: string;
}

interface Guaranteed {
  type: 'Guarantee';
  guarantorChannelIds: [string, string];
}

export type Funding = DirectFunding | IndirectFunding | VirtualFunding | Guaranteed;

export function isIndirectFunding(funding: Funding): funding is IndirectFunding {
  return funding.type === 'Indirect';
}

export function isVirtualFunding(funding: Funding): funding is VirtualFunding {
  return funding.type === 'Virtual';
}

export function isGuarantee(funding: Funding): funding is Guaranteed {
  return funding.type === 'Guarantee';
}

export interface IChannelStoreEntry {
  states: SignedState[];
  privateKey: string;
  participants: Participant[];
  channel: Channel;
  funding?: Funding;
}

export function supported(signedState: SignedState) {
  // TODO: temporarily just check the required length
  return (
    signedState.signatures.filter(Boolean).length === signedState.state.channel.participants.length
  );
}

export class ChannelStoreEntry implements IChannelStoreEntry {
  public readonly states: SignedState[] = [];
  public readonly privateKey: string;
  public readonly participants: Participant[];
  public readonly funding?: Funding;
  public readonly channel: Channel;

  constructor(args: Partial<IChannelStoreEntry>) {
    args = _.cloneDeep(args);

    const { privateKey, participants, channel, states, funding } = args;
    if (privateKey && participants && channel) {
      this.privateKey = privateKey;
      this.participants = participants;
      this.channel = channel;
    } else {
      throw new Error('Required arguments missing');
    }
    this.states = states || [];
    this.funding = funding;
  }

  get args(): IChannelStoreEntry {
    const { states, privateKey, participants, channel, funding }: IChannelStoreEntry = this;
    return { states, privateKey, participants, channel, funding };
  }

  get ourIndex() {
    const idx = this.participants.findIndex(
      p => p.signingAddress === new ethers.Wallet(this.privateKey).address
    );
    if (idx === -1) {
      throw 'Not found';
    }
    return idx;
  }

  get hasSupportedState(): boolean {
    return this.states.some(supported);
  }

  get hasState(): boolean {
    return this.states.length > 0;
  }

  get latestSupportedState(): State {
    const signedState = this.states.find(supported);
    if (!signedState) {
      throw new Error('No supported state found');
    }

    return signedState.state;
  }

  private signedByMe(state: State): boolean {
    return !!this.states
      .find(s => Store.equals(s.state, state))
      ?.signatures.find(
        signature => getStateSignerAddress({ state, signature }) === this.ourAddress
      );
  }

  get latestStateSupportedByMe(): State | undefined {
    return this.states.map(s => s.state).find(state => this.signedByMe(state));
  }

  get ourAddress(): string {
    return this.channel.participants[this.ourIndex];
  }

  get channelId() {
    return getChannelId(this.channel);
  }

  get unsupportedStates(): SignedState[] {
    if (!this.latestSupportedState) {
      return [];
    } else {
      return this.states.slice(
        this.states.map(s => s.state).indexOf(this.latestSupportedState) + 1
      );
    }
  }

  get latestState(): State {
    const state = _.maxBy(this.states, s => s.state.turnNum)?.state;
    if (!state) throw new Error('No states found');

    return state;
  }

  get participantId(): string {
    return this.participants[this.ourIndex].participantId;
  }

  get recipients(): string[] {
    return _.without(
      this.participants.map(p => p.participantId),
      this.participantId
    );
  }
}
