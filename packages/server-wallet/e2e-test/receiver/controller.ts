import {Message} from '@statechannels/wire-format';
import {SignedState, makeDestination, calculateChannelId} from '@statechannels/wallet-core';
import {Participant} from '@statechannels/client-api-schema';

import {bob} from '../../src/wallet/__test__/fixtures/signing-wallets';
import {Wallet} from '../../src/wallet';

export default class ReceiverController {
  private readonly wallet: Wallet = new Wallet();

  private readonly myParticipantID: string = 'receiver';

  public get participantInfo(): Participant {
    return {
      participantId: this.myParticipantID,
      signingAddress: bob().address,
      destination: makeDestination(bob().address),
    };
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

    const {channelResult} = await this.wallet.getState({
      channelId: calculateChannelId({...convertedSignedStates[0]}),
    });

    const {
      outbox: [messageToSendToPayer],
    } = await (channelResult.turnNum < 4 ? this.wallet.joinChannel : this.wallet.updateChannel)(
      channelResult
    );

    return messageToSendToPayer.params as Message;
  }
}
