import { SignedState } from '.';
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

export type Funding = DirectFunding | IndirectFunding | VirtualFunding;

export function isIndirectFunding(
  funding: Funding
): funding is IndirectFunding {
  return funding.type === 'Indirect';
}

export function isVirtualFunding(funding: Funding): funding is VirtualFunding {
  return funding.type === 'Virtual';
}

export interface IChannelStoreEntry {
  supportedState: SignedState[];
  unsupportedStates: SignedState[];
  privateKey: string;
  participants: Participant[];
  funding?: Funding;
}

export class ChannelStoreEntry implements IChannelStoreEntry {
  public supportedState: SignedState[];
  public unsupportedStates: SignedState[];
  public privateKey: string;
  public participants: Participant[];
  public funding: Funding | undefined;

  constructor(args: IChannelStoreEntry) {
    this.supportedState = args.supportedState;
    this.unsupportedStates = args.unsupportedStates;
    this.privateKey = args.privateKey;
    this.participants = args.participants;
    this.funding = args.funding;
  }
  public ourIndex() {
    return this.participants.findIndex(
      p => p.signingAddress === `addressFrom${this.privateKey}`
    );
  }
}
