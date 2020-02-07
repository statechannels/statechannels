import {Observable, fromEvent} from 'rxjs';
import {filter} from 'rxjs/operators';
import {EventEmitter} from 'eventemitter3';
import * as _ from 'lodash';
import {
  getChannelId,
  Outcome,
  signState,
  hashState,
  State as NitroState,
  getStateSignerAddress
} from '@statechannels/nitro-protocol';

import {BigNumber, bigNumberify, splitSignature, joinSignature} from 'ethers/utils';
import {Wallet} from 'ethers';

interface StateVariables {
  outcome: Outcome;
  turnNum: BigNumber;
  appData: string;
  isFinal: boolean;
}

interface ChannelConstants {
  chainId: string;
  participants: Participant[];
  channelNonce: BigNumber;
  appDefinition: string;
  challengeDuration: BigNumber;
}

export interface State extends ChannelConstants, StateVariables {
  channelId: string;
}

interface ChannelStorage {
  myIndex: number;
  channelConstants: ChannelConstants;
  stateVariables: Record<string, StateVariables>;
  signatures: Record<string, (string | undefined)[]>;
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
  signatures: string[];
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

// get it so that when you add a state to a channel, it sends that state to all participant

interface InternalEvents {
  stateReceived: [State];
  newProtocol: [Protocol];
  sendMessage: [Message];
}

class MemoryChannelStorage implements ChannelStorage {
  public channelConstants: ChannelConstants;
  public stateVariables: Record<string, StateVariables>;
  public signatures: Record<string, string[]>;
  public myIndex: number;

  constructor(channelConstants: ChannelConstants, myIndex: number) {
    this.channelConstants = channelConstants;
    this.myIndex = myIndex;
    this.stateVariables = {};
    this.signatures = {};
  }

  get participants(): Participant[] {
    return this.channelConstants.participants;
  }

  signAndAdd(stateVars: StateVariables, privateKey: string) {
    const state = this.toNitroState(stateVars);

    const {signature} = signState(state, privateKey);
    const signatureString = joinSignature(signature);

    this.addState(stateVars, signatureString);

    return {signatureString};
  }

  addState(stateVars: StateVariables, signature: string) {
    const state = this.toNitroState(stateVars);
    const stateHash = hashState(state);
    this.stateVariables[stateHash] = stateVars;
    const {participants} = this.channelConstants;

    // check the signature
    const signer = getStateSignerAddress({state, signature: splitSignature(signature)});
    const signerIndex = participants.findIndex(p => p.signingAddress === signer);

    if (signerIndex === -1) {
      throw new Error('State not signed by a particant of this channel');
    }

    if (!this.signatures[stateHash]) {
      this.signatures[stateHash] = new Array(this.nParticipants());
    }

    this.signatures[stateHash][signerIndex] = signature;
  }
  private nParticipants(): number {
    return this.channelConstants.participants.length;
  }

  // Converts to the legacy State format expected by the Nitro protocol state
  private toNitroState(stateVars: StateVariables): NitroState {
    const {
      challengeDuration,
      appDefinition,
      channelNonce,
      participants,
      chainId
    } = this.channelConstants;
    const channel = {
      channelNonce: channelNonce.toString(),
      chainId,
      participants: participants.map(x => x.signingAddress)
    };

    return {
      ...stateVars,
      challengeDuration: challengeDuration.toNumber(),
      appDefinition,
      channel,
      turnNum: stateVars.turnNum.toNumber()
    };
  }
}

export class MemoryStore {
  private _channels: Record<string, MemoryChannelStorage> = {};
  private _protocols: Protocol[] = [];
  private _nonces: Record<string, BigNumber> = {};
  private _eventEmitter = new EventEmitter<InternalEvents>();
  private _privateKeys: Record<string, string> = {};
  // private _channels: Record<string, any> = {};

  constructor(privateKeys?: string[]) {
    if (privateKeys && privateKeys.length > 0) {
      // load existing keys
      privateKeys.forEach(key => {
        const wallet = new Wallet(key);
        this._privateKeys[wallet.address] = wallet.privateKey;
      });
    } else {
      // generate a new key
      const wallet = Wallet.createRandom();
      this._privateKeys[wallet.address] = wallet.privateKey;
    }
  }

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

  public async createChannel(
    participants: Participant[],
    appDefinition: string,
    challengeDuration: BigNumber,
    stateVars: StateVariables
  ): Promise<string> {
    const addresses = participants.map(x => x.signingAddress);

    const myIndex = addresses.findIndex(address => !!this._privateKeys[address]);
    if (myIndex === -1) {
      throw new Error("Couldn't find the signing key for any participant in wallet.");
    }

    const currentNonce = this.getNonce(addresses);
    const channelNonce = currentNonce ? currentNonce.add(1) : bigNumberify(0);
    this.setNonce(addresses, channelNonce);
    const chainId = '1';

    const channelId = getChannelId({
      chainId,
      channelNonce: channelNonce.toString(),
      participants: addresses
    });
    this._channels[channelId] = new MemoryChannelStorage(
      {channelNonce, chainId, participants, appDefinition, challengeDuration},
      myIndex
    );

    // sign the state, store the channel
    this.addState(channelId, stateVars);

    return Promise.resolve(channelId);
  }

  private getNonce(addresses: string[]): BigNumber | undefined {
    return this._nonces[this.nonceKeyFromAddresses(addresses)];
  }

  private setNonce(addresses: string[], value: BigNumber) {
    this._nonces[this.nonceKeyFromAddresses(addresses)] = value;
  }

  private nonceKeyFromAddresses = (addresses: string[]): string => addresses.join('::');

  // in channel, we should store
  // 1. myIndex
  // 2. participants, including contact details
  // 3. latest outcome(?)
  // 4. states -

  // outcome, turnNum, appData, isFinal
  // channel defines: participant, nonce, chainId, challengeDuration, appDefinition
  addState(channelId: string, stateVars: StateVariables) {
    const channelStorage = this._channels[channelId];

    if (!channelStorage) {
      throw new Error('Channel not found');
    }
    const myAddress = channelStorage.participants[channelStorage.myIndex].signingAddress;
    const privateKey = this._privateKeys[myAddress];

    if (!privateKey) {
      throw new Error('No longer have private key');
    }

    channelStorage.signAndAdd(stateVars, privateKey);
    // sign state

    // how to identify states? probably we should store the state hash

    // add to channel
  }

  public getAddress(): string {
    return Object.keys(this._privateKeys)[0];
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
