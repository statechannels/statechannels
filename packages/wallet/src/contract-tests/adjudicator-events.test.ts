import {getChannelId as nitroGetChannelId} from "@statechannels/nitro-protocol";
import {adjudicatorWatcher} from "../redux/sagas/adjudicator-watcher";
import SagaTester from "redux-saga-tester";
import * as actions from "../redux/actions";
import {depositContract, createChallenge, createWatcherState, concludeGame, respond, getChannelId} from "./test-utils";
import * as walletStates from "../redux/state";
import {getGanacheProvider} from "@statechannels/devtools";
import {convertCommitmentToState} from "../utils/nitro-converter";
import {JsonRpcProvider} from "ethers/providers";
import {Wallet} from "ethers";
jest.setTimeout(60000);

describe("adjudicator listener", () => {
  const provider: JsonRpcProvider = getGanacheProvider();

  const participantA = Wallet.createRandom();
  const participantB = Wallet.createRandom();
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

  it("should not handle an event when no process has registered", async () => {
    const channelId = await getChannelId(provider, getNextNonce(), participantA, participantB);
    const initialState = walletStates.initialized({
      ...walletStates.EMPTY_SHARED_DATA,
      uid: "",
      processStore: {},
      channelSubscriptions: {},
      privateKey: "",
      address: ""
    });
    const sagaTester = new SagaTester({initialState});

    sagaTester.start(adjudicatorWatcher, provider);
    await depositContract(provider, channelId);

    expect(sagaTester.numCalled("WALLET.ADJUDICATOR.CHALLENGE_CREATED_EVENT")).toEqual(0);
  });

  it("should ignore events for other channels", async () => {
    const channelId = await getChannelId(provider, getNextNonce(), participantA, participantB);
    const channelIdToIgnore = await getChannelId(provider, getNextNonce(), participantA, participantB);
    const processId = Wallet.createRandom().address;
    const sagaTester = new SagaTester({initialState: createWatcherState(processId, channelId)});

    sagaTester.start(adjudicatorWatcher, provider);

    await depositContract(provider, channelIdToIgnore);
    expect(sagaTester.numCalled("WALLET.ADJUDICATOR.CHALLENGE_CREATED_EVENT")).toEqual(0);
  });

  it("should handle a challengeCreated event", async () => {
    const startTimestamp = Date.now();
    const channelNonce = getNextNonce();

    const processId = Wallet.createRandom().address;

    const sagaTester = new SagaTester({initialState: createWatcherState(processId)});
    sagaTester.start(adjudicatorWatcher, provider);

    const challengeState = convertCommitmentToState(
      await createChallenge(provider, channelNonce, participantA, participantB)
    );

    await sagaTester.waitFor("WALLET.ADJUDICATOR.CHALLENGE_CREATED_EVENT");

    const action: actions.ChallengeCreatedEvent = sagaTester.getLatestCalledAction();

    expect(action.finalizedAt).toBeGreaterThan(startTimestamp);
    expect(action.challengeStates[1].state).toMatchObject(challengeState);
  });

  it("should handle a ChallengeCleared event when registered for that channel", async () => {
    const channelNonce = getNextNonce();
    const channelId = nitroGetChannelId({
      chainId: (await provider.getNetwork()).chainId.toString(),
      channelNonce: channelNonce.toString(),
      participants: [participantA.address, participantB.address]
    });
    const processId = Wallet.createRandom().address;

    const challenge = await createChallenge(provider, channelNonce, participantA, participantB);

    const sagaTester = new SagaTester({initialState: createWatcherState(processId, channelId)});
    sagaTester.start(adjudicatorWatcher, provider);

    const response = await respond(provider, channelNonce, participantA, participantB, challenge);

    await sagaTester.waitFor("WALLET.ADJUDICATOR.CHALLENGE_CLEARED_EVENT");

    const action: actions.ChallengeClearedEvent = sagaTester.getLatestCalledAction();
    expect(action.channelId).toEqual(channelId);
    expect(action.newTurnNumRecord).toEqual(response.toCommitment.turnNum);
  });

  it("should handle a concluded event when registered for that channel", async () => {
    const channelNonce = getNextNonce();
    const channelId = nitroGetChannelId({
      chainId: (await provider.getNetwork()).chainId.toString(),
      channelNonce: channelNonce.toString(),
      participants: [participantA.address, participantB.address]
    });
    const processId = Wallet.createRandom().address;
    const sagaTester = new SagaTester({initialState: createWatcherState(processId, channelId)});
    sagaTester.start(adjudicatorWatcher, provider);

    await concludeGame(provider, channelNonce, participantA, participantB);

    await sagaTester.waitFor("WALLET.ADJUDICATOR.CONCLUDED_EVENT");
    const action: actions.ConcludedEvent = sagaTester.getLatestCalledAction();

    expect(action.channelId).toEqual(channelId);
  });
});
