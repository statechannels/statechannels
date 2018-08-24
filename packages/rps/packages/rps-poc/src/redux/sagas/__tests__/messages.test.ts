import { Channel } from 'redux-saga';
import { expectSaga } from 'redux-saga-test-plan';
import * as matchers from 'redux-saga-test-plan/matchers';

import { reduxSagaFirebase } from '../../../gateways/firebase';
import { MessageAction, MessageActionType, SendMessageAction } from '../../actions/messages';
import messageSaga from '../messages';

describe('Messages', () => {
  // Dummy channel that we can pass around
  const mockChannel: Channel<any> = {
    take: () => {
      return;
    },
    put: () => {
      return;
    },
    flush: () => {
      return;
    },
    close: () => {
      return;
    },
  };

  // Some dummy data that we can test against
  const address = '0xfake';
  const key = 'test';
  const value = 'testValue';


  it('should subscribe to any messages and handle receiving a message', () => {
    const subAction = { type: MessageActionType.SUBSCRIBE_MESSAGES, address };
    return expectSaga(messageSaga)
      .provide( [
        [matchers.call.fn(reduxSagaFirebase.database.channel), mockChannel],
        [matchers.take(mockChannel), { snapshot: { key }, value }],
      ])
      .dispatch(subAction)
      .put(MessageAction.messageReceived(value))
      .call(reduxSagaFirebase.database.delete, `/messages/${address}/${key}`)
      .silentRun();
  });

  it('should send a message', () => {
    const sendAction: SendMessageAction = {
      type: MessageActionType.SEND_MESSAGE,
      to: 'someone',
      data: 'data',
    };

    return expectSaga(messageSaga)
      .provide( [
        [matchers.call.fn(reduxSagaFirebase.database.channel), mockChannel],
        [matchers.take(mockChannel), { snapshot: { key }, value }],
      ])
      .dispatch(sendAction)
      .call(reduxSagaFirebase.database.create, `/messages/${sendAction.to}`, sendAction.data)
      .silentRun();
  });
});
