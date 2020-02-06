import {Observable, fromEvent} from 'rxjs';
import {filter} from 'rxjs/operators';
import {EventEmitter} from 'eventemitter3';
import * as _ from 'lodash';
import {getChannelId} from '@statechannels/nitro-protocol';

import {Signature, BigNumber, bigNumberify} from 'ethers/utils';
type Bytes32 = string;
type Uint256 = string;

export interface State {
  channelId: Bytes32;
  turnNum: BigNumber;
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
  sendMessage: [Message];
}

export class MemoryStore {
  // private _channels: Record<string, any>;
  private _protocols: Protocol[] = [];
  private _nonces: Record<string, BigNumber> = {};
  private _eventEmitter = new EventEmitter<InternalEvents>();
  // private _channels: Record<string, any> = {};

  public stateReceivedFeed(channelId: string): Observable<State> {
    return fromEvent<State>(this._eventEmitter, 'stateReceived').pipe(
      filter(e => e.channelId === channelId)
    );
  }

  public newProtocolFeed(): Observable<Protocol> {
    return fromEvent(this._eventEmitter, 'newProtocol');
  }

  public messageFeed(): Observable<Message> {
    return fromEvent(this._eventEmitter, 'sendMessage');
  }

  public createChannel(participants: Participant[]): Promise<string> {
    const addresses = participants.map(x => x.signingAddress);
    const currentNonce = this.getNonce(addresses);
    const newNonce = currentNonce ? currentNonce.add(1) : bigNumberify(0);
    this.setNonce(addresses, newNonce);
    const chainId = '1';

    const channelId = getChannelId({
      chainId,
      channelNonce: newNonce.toString(),
      participants: addresses
    });

    return Promise.resolve(channelId);
  }

  private getNonce(addresses: string[]): BigNumber | undefined {
    return this._nonces[this.nonceKeyFromAddresses(addresses)];
  }

  private setNonce(addresses: string[], value: BigNumber) {
    this._nonces[this.nonceKeyFromAddresses(addresses)] = value;
  }

  private nonceKeyFromAddresses = (addresses: string[]): string => addresses.join('::');

  private(participants: Participant[]): string {
    return participants.map(p => p.signingAddress).join('::');
  }

  addState(channelId: string, state: State) {
    /*todo*/
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
