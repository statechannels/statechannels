import { adjudicatorWatcher } from '../redux/sagas/adjudicator-watcher';
import { ethers } from 'ethers';
import SagaTester from 'redux-saga-tester';
import * as actions from '../redux/actions';
import {
  depositContract,
  createChallenge,
  concludeGame,
  refuteChallenge,
  respondWithMove,
  getChannelId,
} from './test-utils';

jest.setTimeout(60000);

describe('adjudicator listener', () => {
  const provider: ethers.providers.JsonRpcProvider = new ethers.providers.JsonRpcProvider(
    `http://localhost:${process.env.DEV_GANACHE_PORT}`,
  );

  const participantA = ethers.Wallet.createRandom();
  const participantB = ethers.Wallet.createRandom();
  let nonce = 5;
  function getNextNonce() {
    return ++nonce;
  }
  beforeAll(async () => {
    // This is a work around for https://github.com/ethers-io/ethers.js/issues/393
    // We manually create a transaction to force a block to be mined in ganache so that events get properly caught
    // otherwise the first event is always missed since ethers won't listen for events until a block has been mined
    const channelId = await getChannelId(provider, getNextNonce(), participantA, participantB);
    await depositContract(provider, channelId);
  });
  it('should handle a funds received event', async () => {
    const channelId = await getChannelId(provider, getNextNonce(), participantA, participantB);

    const sagaTester = new SagaTester({});
    sagaTester.start(adjudicatorWatcher, channelId, provider);
    await depositContract(provider, channelId);
    await sagaTester.waitFor(actions.funding.FUNDING_RECEIVED_EVENT);

    const action: actions.funding.FundingReceivedEvent = sagaTester.getLatestCalledAction();
    expect(action.type).toEqual(actions.funding.FUNDING_RECEIVED_EVENT);
    expect(action.channelId).toEqual(channelId);
    expect(action.amount).toEqual('0x05');
    expect(action.totalForDestination).toEqual('0x05');
  });

  it('should handle a challengeCreated event', async () => {
    const startTimestamp = Date.now();
    const channelNonce = getNextNonce();
    const channelId = await getChannelId(provider, channelNonce, participantA, participantB);
    const sagaTester = new SagaTester({});
    sagaTester.start(adjudicatorWatcher, channelId, provider);
    const challengeState = await createChallenge(
      provider,

      channelNonce,
      participantA,
      participantB,
    );
    await sagaTester.waitFor(actions.channel.CHALLENGE_CREATED_EVENT);
    const action: actions.channel.ChallengeCreatedEvent = sagaTester.getLatestCalledAction();

    expect(action.finalizedAt * 1000).toBeGreaterThan(startTimestamp);
    expect(action.commitment).toEqual(challengeState);
  });

  it('should handle a concluded event', async () => {
    const channelNonce = getNextNonce();
    const channelId = await getChannelId(provider, channelNonce, participantA, participantB);
    const sagaTester = new SagaTester({});
    sagaTester.start(adjudicatorWatcher, channelId, provider);
    await concludeGame(provider, channelNonce, participantA, participantB);
    await sagaTester.waitFor(actions.channel.CONCLUDED_EVENT);
    const action: actions.channel.concludedEvent = sagaTester.getLatestCalledAction();
    // TODO: We should check the channel ID
    expect(action.channelId).toBeDefined();
  });

  it('should handle a refute event', async () => {
    const channelNonce = getNextNonce();
    const channelId = await getChannelId(provider, channelNonce, participantA, participantB);
    await createChallenge(provider, channelNonce, participantA, participantB);

    const sagaTester = new SagaTester({});
    sagaTester.start(adjudicatorWatcher, channelId, provider);
    const refuteCommitment = await refuteChallenge(
      provider,

      channelNonce,
      participantA,
      participantB,
    );
    await sagaTester.waitFor(actions.channel.REFUTED_EVENT);
    const action: actions.channel.RefutedEvent = sagaTester.getLatestCalledAction();
    expect(action.type === actions.channel.REFUTED_EVENT);
    expect(action.refuteCommitment).toEqual(refuteCommitment);
  });

  it('should handle a respondWithMove event', async () => {
    const channelNonce = getNextNonce();
    const channelId = await getChannelId(provider, channelNonce, participantA, participantB);

    await createChallenge(provider, channelNonce, participantA, participantB);

    const sagaTester = new SagaTester({});
    sagaTester.start(adjudicatorWatcher, channelId, provider);
    const responseState = await respondWithMove(
      provider,

      channelNonce,
      participantA,
      participantB,
    );
    await sagaTester.waitFor(actions.channel.RESPOND_WITH_MOVE_EVENT);
    const action: actions.channel.RespondWithMoveEvent = sagaTester.getLatestCalledAction();
    expect(action.type === actions.channel.RESPOND_WITH_MOVE_EVENT);
    expect(action.responseCommitment).toEqual(responseState);
  });
});
