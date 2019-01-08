import { adjudicatorWatcher } from "../redux/sagas/adjudicator-watcher";
import { ethers } from "ethers";
import SagaTester from 'redux-saga-tester';
import * as actions from "../redux/actions";
import { deployContract, depositContract, createChallenge, concludeGame, refuteChallenge, respondWithMove } from './test-utils';

jest.setTimeout(20000);

describe('adjudicator listener', () => {
  const provider: ethers.providers.JsonRpcProvider = new ethers.providers.JsonRpcProvider('http://localhost:8545');
  const participantA = ethers.Wallet.createRandom();
  const participantB = ethers.Wallet.createRandom();
  let nonce = 5;
  function getNextNonce() {
    return ++nonce;
  }


  it("should handle a funds received event", async () => {
    const channelNonce = getNextNonce();
    const contractAddress = await deployContract(channelNonce, participantA, participantB);
    const sagaTester = new SagaTester({});
    sagaTester.start(adjudicatorWatcher, contractAddress, provider);
    await depositContract(contractAddress);
    await sagaTester.waitFor(actions.FUNDING_RECEIVED_EVENT);

    const action = sagaTester.getLatestCalledAction();
    expect(action.type).toEqual(actions.FUNDING_RECEIVED_EVENT);
    expect(parseInt(action.amountReceived, 16)).toEqual(5);
    expect(parseInt(action.adjudicatorBalance, 16)).toEqual(10);
    const senderAddress = await provider.getSigner().getAddress();
    expect(action.sender).toEqual(senderAddress);
  });

  it("should handle a challengeCreated event", async () => {
    const channelNonce = getNextNonce();
    const contractAddress = await deployContract(channelNonce, participantA, participantB);
    await depositContract(contractAddress);

    const sagaTester = new SagaTester({});
    sagaTester.start(adjudicatorWatcher, contractAddress, provider);
    const challengeState = await createChallenge(contractAddress, channelNonce, participantA, participantB);
    await sagaTester.waitFor(actions.CHALLENGE_CREATED_EVENT);
    const action = sagaTester.getLatestCalledAction();
    expect(action.type === action.CHALLENGE_CREATED_EVENT);
    expect(action.expirationTime * 1000).toBeGreaterThan(Date.now());
    expect(action.state.toUpperCase()).toEqual(challengeState.toUpperCase());
  });

  it("should handle a concluded event", async () => {
    const channelNonce = getNextNonce();
    const contractAddress = await deployContract(channelNonce, participantA, participantB);
    await depositContract(contractAddress);
    const sagaTester = new SagaTester({});
    sagaTester.start(adjudicatorWatcher, contractAddress, provider);
    await concludeGame(contractAddress, channelNonce, participantA, participantB);
    await sagaTester.waitFor(actions.GAME_CONCLUDED_EVENT);
    const action = sagaTester.getLatestCalledAction();
    expect(action.type === actions.GAME_CONCLUDED_EVENT);
  });

  it("should handle a refute event", async () => {
    const channelNonce = getNextNonce();
    const contractAddress = await deployContract(channelNonce, participantA, participantB);
    await depositContract(contractAddress);
    await createChallenge(contractAddress, channelNonce, participantA, participantB);

    const sagaTester = new SagaTester({});
    sagaTester.start(adjudicatorWatcher, contractAddress, provider);
    const refuteState = await refuteChallenge(contractAddress, channelNonce, participantA, participantB);
    await sagaTester.waitFor(actions.REFUTED_EVENT);
    const action = sagaTester.getLatestCalledAction();
    expect(action.type === actions.REFUTED_EVENT);
    expect(action.refuteState.toUpperCase()).toEqual(refuteState.toUpperCase());
  });


  it("should handle a respondWithMove event", async () => {
    const channelNonce = getNextNonce();
    const contractAddress = await deployContract(channelNonce, participantA, participantB);
    await depositContract(contractAddress);
    await createChallenge(contractAddress, channelNonce, participantA, participantB);

    const sagaTester = new SagaTester({});
    sagaTester.start(adjudicatorWatcher, contractAddress, provider);
    const responseState = await respondWithMove(contractAddress, channelNonce, participantA, participantB);
    await sagaTester.waitFor(actions.RESPOND_WITH_MOVE_EVENT);
    const action: actions.RespondWithMoveEvent = sagaTester.getLatestCalledAction();
    expect(action.type === actions.RESPOND_WITH_MOVE_EVENT);
    expect(action.responseState.toUpperCase()).toEqual(responseState.toUpperCase());
  });


});
