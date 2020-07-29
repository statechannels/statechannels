import {Message} from '@statechannels/wire-format';
import {
  SignedState,
  makeDestination,
  calculateChannelId,
  SimpleAllocation,
} from '@statechannels/wallet-core';
import {Participant} from '@statechannels/client-api-schema';

import knex from '../../src/db/connection';
import {bob} from '../../src/wallet/__test__/fixtures/signing-wallets';
import {SigningWallet} from '../../src/models/signing-wallet';
import {truncate} from '../../src/db-admin/db-admin-connection';
import {Wallet} from '../../src/wallet';
import {Channel} from '../../src/models/channel';

export default class PongController {
  private readonly wallet: Wallet = new Wallet();

  private readonly myParticipantID: string = 'pong';

  public get participantInfo(): Participant {
    return {
      participantId: this.myParticipantID,
      signingAddress: bob().address,
      destination: makeDestination(bob().address),
    };
  }

  public async reset(): Promise<void> {
    await truncate(knex);
    await SigningWallet.query().insert(bob());
  }

  public async seedWith(channelJson: object): Promise<void> {
    await Channel.query().insert({
      ...channelJson,
      // Test fixture used in e2e.test.ts hard-codes Alice atm
      signingAddress: this.participantInfo.signingAddress,
    });
  }

  public async acceptMessageAndReturnReplies(message: Message): Promise<Message> {
    const {
      recipient: to,
      sender: from,
      data: {signedStates},
    } = message;

    // FIXME: server-wallet is using wallet-core, not wire-format for
    // types of messages between parties. e2e-test uses wire-format
    const convertedSignedStates = (signedStates as unknown) as SignedState[];

    // FIXME: At this point, outbox should have ChannelUpdated or something
    // waiting on https://github.com/statechannels/statechannels/pull/2370
    await this.wallet.pushMessage({
      signedStates: convertedSignedStates,
      to,
      from,
    });

    if (convertedSignedStates.length === 0) {
      return {
        recipient: from,
        sender: this.myParticipantID,
        data: {signedStates: [], objectives: []},
      };
    }

    const {
      channelResults: [channelResult],
    } = await this.wallet.getState({
      channelId: calculateChannelId({...convertedSignedStates[0]}),
    });

    if (channelResult.turnNum < 4) {
      // TODO: Join Channel
      return {
        recipient: from,
        sender: this.myParticipantID,
        data: {signedStates: [], objectives: []},
      };
    }

    const {
      outbox: [messageToSendToPing],
    } = await this.wallet.updateChannel(channelResult);

    return messageToSendToPing.params as Message;
  }
}
