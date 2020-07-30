import {AddressZero} from '@ethersproject/constants';
import axios from 'axios';
import {Message} from '@statechannels/wire-format';
import {ChannelResult, Participant} from '@statechannels/client-api-schema';
import {Wallet} from 'ethers';
import {makeDestination, BN, SignedState} from '@statechannels/wallet-core';

import {Wallet as ServerWallet} from '../../src/wallet';
import {Bytes32, Address} from '../../src/type-aliases';

export default class PingClient {
  private readonly wallet: ServerWallet = new ServerWallet();

  constructor(private readonly pk: Bytes32, private readonly pongHttpServerURL: string) {}

  public readonly participantId = 'ping';

  public get address(): Address {
    return new Wallet(this.pk).address;
  }

  public get destination(): Address {
    return makeDestination(this.address);
  }

  public get me(): Participant {
    const {address: signingAddress, destination, participantId} = this;
    return {
      signingAddress,
      destination,
      participantId,
    };
  }

  public async getPongsParticipantInfo(): Promise<Participant> {
    const {data: participant} = await axios.get<Participant>(
      `${this.pongHttpServerURL}/participant`
    );
    return participant;
  }

  public async getChannel(channelId: string): Promise<ChannelResult> {
    const {
      channelResults: [channel],
    } = await this.wallet.getState({channelId});

    return channel;
  }

  public async getChannels(): Promise<ChannelResult[]> {
    const {channelResults} = await this.wallet.getChannels();
    return channelResults;
  }

  public async createPingChannel(pong: Participant): Promise<ChannelResult> {
    const {
      outbox: [{params}],
      channelResults: [channel],
    } = await this.wallet.createChannel({
      appData: '0x',
      appDefinition: AddressZero,
      fundingStrategy: 'Direct',
      participants: [this.me, pong],
      allocations: [
        {
          token: AddressZero,
          allocationItems: [
            {
              amount: BN.from(0),
              destination: this.me.destination,
            },
            {amount: BN.from(0), destination: pong.destination},
          ],
        },
      ],
    });

    const message = await this.messagePongAndExpectReply(params as Message);

    await this.wallet.pushMessage({
      ...message,
      to: message.recipient,
      from: message.sender,
    });

    return channel;
  }

  public async ping(channelId: string): Promise<void> {
    const channel = await this.getChannel(channelId);

    // Assuming MessageQueued inside the outbox
    const {
      outbox: [{params}],
    } = await this.wallet.updateChannel(channel);

    const {
      recipient: to,
      sender: from,
      data: {signedStates: unconvertedSignedStates},
    } = await this.messagePongAndExpectReply(params as Message);

    // FIXME: server-wallet is using wallet-core, not wire-format for
    // types of messages between parties. e2e-test uses wire-format
    const signedStates = unconvertedSignedStates as SignedState[] | undefined;

    await this.wallet.pushMessage({
      signedStates,
      to,
      from,
    });
  }

  public emptyMessage(): Promise<Message> {
    return this.messagePongAndExpectReply({
      sender: 'ping',
      recipient: 'pong',
      data: {signedStates: [], objectives: []},
    });
  }

  private async messagePongAndExpectReply(message: Message): Promise<Message> {
    const {data: reply} = await axios.post(this.pongHttpServerURL + '/inbox', {message});
    return reply;
  }
}
