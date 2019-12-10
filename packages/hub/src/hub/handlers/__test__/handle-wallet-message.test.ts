import {ChannelOpen, ChannelJoined} from '../../../communication';
import {handleWalletMessage} from '../handle-wallet-message';
import {join} from 'path';

const sampleMessagePrefix = '../../../message/sample-messages';
function readSampleMessage(messageName) {
  return require(join(sampleMessagePrefix, messageName + '.json'));
}

describe('handle-wallet-message', () => {
  it('ChanelOpen', async () => {
    const channelOpenAction: ChannelOpen = readSampleMessage('channel-open');
    const messageReleayRequested = await handleWalletMessage(channelOpenAction);
    expect(messageReleayRequested).toHaveLength(1);

    const expectedAction: ChannelJoined = readSampleMessage('channel-joined');
    const receivedAction = messageReleayRequested[0].actionToRelay;
    // note: signatures are not validated
    expect(receivedAction).toMatchObject(expectedAction);
  });
});
