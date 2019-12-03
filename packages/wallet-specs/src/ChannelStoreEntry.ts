import { Channel, getChannelID, SignedState } from '.';
import { Participant } from './store';

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

export type Funding =
  | DirectFunding
  | IndirectFunding
  | VirtualFunding
  | Guaranteed;

export function isIndirectFunding(
  funding: Funding
): funding is IndirectFunding {
  return funding.type === 'Indirect';
}

export function isVirtualFunding(funding: Funding): funding is VirtualFunding {
  return funding.type === 'Virtual';
}

export function isGuarantee(funding: Funding): funding is Guaranteed {
  return funding.type === 'Guarantee';
}

export interface IChannelStoreEntry {
  supportedState: SignedState[];
  unsupportedStates: SignedState[];
  privateKey: string;
  participants: Participant[];
  channel: Channel;
  funding?: Funding;
}

export class ChannelStoreEntry implements IChannelStoreEntry {
  public supportedState: SignedState[];
  public unsupportedStates: SignedState[];
  public privateKey: string;
  public participants: Participant[];
  public funding: Funding | undefined;
  public channel: Channel;

  constructor(args: IChannelStoreEntry) {
    this.supportedState = args.supportedState;
    this.unsupportedStates = args.unsupportedStates;
    this.privateKey = args.privateKey;
    this.participants = args.participants;
    this.funding = args.funding;
  }

  get args(): IChannelStoreEntry {
    const {
      supportedState,
      unsupportedStates,
      privateKey,
      participants,
      channel,
      funding,
    }: IChannelStoreEntry = this;
    return {
      supportedState,
      unsupportedStates,
      privateKey,
      participants,
      channel,
      funding,
    };
  }

  get ourIndex() {
    return this.participants.findIndex(
      p => p.signingAddress === `addressFrom${this.privateKey}`
    );
  }

  get channelId() {
    return getChannelID(this.channel);
  }
}
