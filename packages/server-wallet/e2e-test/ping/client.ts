import {AddressZero} from '@ethersproject/constants';
import axios from 'axios';
import {Message} from '@statechannels/wire-format';
import {ChannelResult, Participant} from '@statechannels/client-api-schema';
import {Wallet} from 'ethers';
import {makeDestination, BN} from '@statechannels/wallet-core';

import {Wallet as ServerWallet} from '../../src/wallet';
import {Bytes32} from '../../src/type-aliases';

export default class PingClient {
  private readonly wallet: ServerWallet = new ServerWallet();

  constructor(private readonly pk: Bytes32, private readonly pongHttpServerURL: string) {}

  public get me(): Participant {
    const {address: signingAddress} = new Wallet(this.pk);
    return {
      signingAddress,
      participantId: 'ping',
      destination: makeDestination(signingAddress),
    };
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

    const message = await this.messagePongAndExpectReply(params as Message);

    await this.wallet.pushMessage({
      ...message,
      to: message.recipient,
      from: message.sender,
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
