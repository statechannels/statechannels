import {Observable, fromEvent} from 'rxjs';
import {filter} from 'rxjs/operators';
import {EventEmitter} from 'eventemitter3';
import * as _ from 'lodash';

import {Signature} from 'ethers/utils';
type Bytes32 = string;
type Uint256 = string;

export interface State {
  channelId: Bytes32;
}

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

export interface Participant {
  participantId: string;
  signingAddress: string;
  destination: string;
}
interface SignedState {
  state: State;
  signatures: Signature[];
}

export interface ChannelStoreEntry {
  states: SignedState[];
  privateKey: string;
  participants: Participant[];
  channelNonce: Uint256;
  chainId: Uint256;
  funding?: Funding;
}

interface CreateAndDirectFund {
  name: 'CreateAndDirectFund';
  participants: Participant[];
}
interface Message {
  signedStates?: SignedState[];
  protocols?: Protocol[];
}

export type Protocol = CreateAndDirectFund;

export interface StoreV2 {
  onStateReceived: (channelId: string) => Observable<any>; // observable
  onNewProtocol: () => Observable<Protocol>;
  onNewOutcomeSupported: (channelId: string) => Observable<any>;
  onMessageQueued: () => Observable<Message>;

  registerProtocol: (protocol: Protocol) => void;

  pushMessage: (message: Message) => {}; // add a signed state from our opponent

  addState: () => {}; // our own state - signs and adds, doesn't trigger 'StateReceived'

  getAddress: () => {}; //
  registerChannel: () => {}; // returns channelId

  // messages to send
  outbox: () => {};
}

// get it so that when you add a state to a channel, it sends that state to all participant

interface InternalEvents {
  stateReceived: [State];
  newProtocol: [Protocol];
}

export class MemoryStore {
  // private _channels: Record<string, any>;
  private _protocols: Protocol[];
  private _eventEmitter = new EventEmitter<InternalEvents>();

  constructor() {
    this._protocols = [];
  }

  statesReceived(channelId: string): Observable<State> {
    return fromEvent<State>(this._eventEmitter, 'stateReceived').pipe(
      filter(e => e.channelId === channelId)
    );
  }

  newProtocols(): Observable<Protocol> {
    return fromEvent(this._eventEmitter, 'newProtocol');
  }

  pushMessage(message: Message) {
    const {signedStates, protocols} = message;

    if (signedStates) {
      // todo: check sig
      // todo: check the channel involves me
      signedStates.forEach(sstate => this._eventEmitter.emit('stateReceived', sstate.state));
    }

    if (protocols) {
      protocols.forEach(protocol => {
        if (!this._protocols.find(p => _.isEqual(p, protocol))) {
          this._protocols.push(protocol);
          this._eventEmitter.emit('newProtocol', protocol);
        }
      });
    }
  }
}
