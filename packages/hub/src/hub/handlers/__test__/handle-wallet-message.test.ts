import {
  ChannelOpen,
  ChannelJoined,
  StrategyProposed,
  StrategyApproved,
  SignedStatesReceived,
  RelayableAction
} from '../../../communication';
import {handleWalletMessage} from '../handle-wallet-message';
import {join} from 'path';

const sampleMessagePrefix = '../../../message/sample-messages';
function readSampleMessage(messageName) {
  return require(join(sampleMessagePrefix, messageName + '.json'));
}

async function step<Incoming extends RelayableAction, Outgoing extends RelayableAction>(
  incoming: string,
  outgoing: string
) {
  const incomingAction: Incoming = readSampleMessage(incoming);
  const messageReleayRequested1 = await handleWalletMessage(incomingAction);
  expect(messageReleayRequested1).toHaveLength(1);
  const expectedAction1: Outgoing = readSampleMessage(outgoing);
  const receivedAction1 = messageReleayRequested1[0].data;
  expect(receivedAction1).toMatchObject(expectedAction1);
}

describe('handle-wallet-message', () => {
  // note: signatures are not validated
  it('open and fund ledger channel sequence', async () => {
    await step<ChannelOpen, ChannelJoined>('channel-open', 'channel-joined');
    await step<StrategyProposed, StrategyApproved>('strategy-proposed', 'strategy-approved');
    await step<SignedStatesReceived, SignedStatesReceived>(
      'direct-fund-prefund1',
      'direct-fund-prefund2'
    );
    await step<SignedStatesReceived, SignedStatesReceived>(
      'direct-fund-postfund1',
      'direct-fund-postfund2'
    );
    await step<SignedStatesReceived, SignedStatesReceived>(
      'direct-fund-consensus1',
      'direct-fund-consensus2'
    );
    await step<SignedStatesReceived, SignedStatesReceived>('ledger-postfund1', 'ledger-postfund2');
  });
});
