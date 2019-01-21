import { ethers, ContractFactory } from 'ethers';
import linker from 'solc/linker';

import expectRevert from '../helpers/expect-revert';

import { CountingGame } from '../../test-game/counting-game';
import { Channel } from '../..';

import StateArtifact from '../../../build/contracts/State.json';

import RulesArtifact from '../../../build/contracts/Rules.json';
import TestRulesArtifact from '../../../build/contracts/TestRules.json';

import CountingStateArtifact from '../../../build/contracts/CountingState.json';
import CountingGameArtifact from '../../../build/contracts/CountingGame.json';

const provider = new ethers.providers.JsonRpcProvider('http://localhost:8545');
const signer = provider.getSigner();

const TURN_NUM_MUST_INCREMENT = "turnNum must increase by 1";
const CHANNEL_ID_MUST_MATCH = "channelId must match";
const allocationsMustEqual = (stateType) => `${stateType}: allocations must be equal`;
const destinationsMustEqual = (stateType) => `${stateType}: destinations must be equal`;
const gameAttributesMustMatch = (stateType) => `${stateType}: gameAttributes must be equal`;
const stateCountMustIncrement = (stateType) => `${stateType}: stateCount must increase by 1`;
const stateCountMustReset = (stateType, nextStateType) => `${stateType}: stateCount must be reset when transitioning to ${nextStateType}`;
const stateTypeMustBe = (stateType, nextStateType) => `${stateType}: stateType must be ${nextStateType}`;

describe('Rules', () => {

  let channel;
  let otherChannel;
  let defaults;

  let testFramework;

  const allocation = [12, 13];
  const otherallocation = [10, 15];

  const participantA = new ethers.Wallet(
    '6cbed15c793ce57650b9877cf6fa156fbef513c4e6134f022a85b1ffdd59b2a1',
  );
  const participantB = new ethers.Wallet(
    '6370fd033278c143179d81c5526140625662b8daa446c22ee2d73db3707e620c',
  );
  const participants = [participantA.address, participantB.address];
  const destination = [participantA.address, participantB.address];
  const otherDestination = [participantB.address, participantA.address];

  let fromState;
  let toState;


  beforeAll(async () => {
    // Contract setup --------------------------------------------------------------------------
    const networkId = (await provider.getNetwork()).chainId;
    CountingStateArtifact.bytecode = linker.linkBytecode(CountingStateArtifact.bytecode, {
      State: StateArtifact.networks[networkId].address,
    });

    CountingGameArtifact.bytecode = linker.linkBytecode(CountingGameArtifact.bytecode, {
      CountingState: CountingStateArtifact.networks[networkId].address,
    });
    const gameContract = await ContractFactory.fromSolidity(CountingGameArtifact, signer).attach(
      CountingGameArtifact.networks[networkId].address,
    );

    otherChannel = new Channel(gameContract.address, 1, participants);

    RulesArtifact.bytecode = linker.linkBytecode(RulesArtifact.bytecode, {
      State: StateArtifact.networks[networkId].address,
    });

    TestRulesArtifact.bytecode = linker.linkBytecode(TestRulesArtifact.bytecode, { "State": StateArtifact.networks[networkId].address });
    TestRulesArtifact.bytecode = linker.linkBytecode(TestRulesArtifact.bytecode, { "Rules": RulesArtifact.networks[networkId].address });
    testFramework = await ContractFactory.fromSolidity(TestRulesArtifact, signer).deploy();
    // Contract setup --------------------------------------------------------------------------

    channel = new Channel(gameContract.address, 0, participants);
    defaults = { channel, allocation, destination, gameCounter: 0 };
  });

  const validTransition = async (state1, state2) => {
    return await testFramework.validTransition(state1.args, state2.args);
  };

  describe('preFundSetup -> preFundSetup', () => {
    beforeEach(() => {
      fromState = CountingGame.preFundSetupState({ ...defaults, turnNum: 0, stateCount: 0 });
      toState = CountingGame.preFundSetupState({ ...defaults, turnNum: 1, stateCount: 1 });
    });

    it('allows a valid transition', async () => {
      expect(await validTransition(fromState, toState)).toEqual(true);
    });

    it("rejects a transition where the turnNum doesn't increment", async () => {
      toState.turnNum = fromState.turnNum;
      await expectRevert(validTransition(fromState, toState), TURN_NUM_MUST_INCREMENT); // passes
    });

    it('rejects any transition where the channel changes', async () => {
      toState.channel = otherChannel;
      await expectRevert(validTransition(fromState, toState), CHANNEL_ID_MUST_MATCH);
    });

    it('rejects a transition where the balances changes', async () => {
      toState.allocation = otherallocation;
      await expectRevert(validTransition(fromState, toState), allocationsMustEqual("PreFundSetup"));
    });

    it('rejects a transition where the destination changes', async () => {
      toState.destination = otherDestination;
      await expectRevert(validTransition(fromState, toState), destinationsMustEqual("PreFundSetup"));
    });

    it("rejects a transition where the count doesn't increment", async () => {
      toState.stateCount = fromState.stateCount;
      await expectRevert(validTransition(fromState, toState), stateCountMustIncrement("PreFundSetup"));
    });
    it('rejects a transition where the game attributes changes', async () => {
      toState.gameCounter = 45;
      await expectRevert(validTransition(fromState, toState), gameAttributesMustMatch("PreFundSetup"));
    });
  });

  describe('preFundSetup -> PostFundSetup', () => {
    beforeEach(() => {
      fromState = CountingGame.preFundSetupState({ ...defaults, turnNum: 1, stateCount: 1 });
      toState = CountingGame.postFundSetupState({ ...defaults, turnNum: 2, stateCount: 0 });
    });

    it('allows a valid transition', async () => {
      expect(await validTransition(fromState, toState)).toBeTruthy();
    });

    it("rejects a transition where the turnNum doesn't increment", async () => {
      toState.turnNum = fromState.turnNum;
      await expectRevert(validTransition(fromState, toState), TURN_NUM_MUST_INCREMENT);
    });

    it('rejects any transition where the channel changes', async () => {
      toState.channel = otherChannel;
      await expectRevert(validTransition(fromState, toState), CHANNEL_ID_MUST_MATCH);
    });

    it('rejects a transition not from the last preFundSetup state', async () => {
      fromState.stateCount = 0;
      await expectRevert(validTransition(fromState, toState), stateTypeMustBe("PreFundSetup", "PreFundSetup"));
    });

    it('rejects a transition where the balances changes', async () => {
      toState.allocation = otherallocation;
      await expectRevert(validTransition(fromState, toState), allocationsMustEqual("PreFundSetup"));
    });

    it('rejects a transition where the destination changes', async () => {
      toState.destination = otherDestination;
      await expectRevert(validTransition(fromState, toState), destinationsMustEqual("PreFundSetup"));
    });

    it("rejects a transition where the count doesn't reset", async () => {
      toState.stateCount = 2;
      await expectRevert(validTransition(fromState, toState), stateCountMustReset("PreFundSetup", "PostFundSetup"));
    });

    it('rejects a transition where the position changes', async () => {
      toState.gameCounter = 45;
      await expectRevert(validTransition(fromState, toState), gameAttributesMustMatch("PreFundSetup"));
    });
  });

  describe('preFundSetup -> conclude', () => {
    beforeEach(() => {
      fromState = CountingGame.preFundSetupState({ ...defaults, turnNum: 1, stateCount: 1 });
      toState = CountingGame.concludeState({ ...defaults, turnNum: 2 });
    });

    it('allows a valid transition', async () => {
      expect(await validTransition(fromState, toState)).toBeTruthy();
    });

    it("rejects a transition where the turnNum doesn't increment", async () => {
      toState.turnNum = fromState.turnNum;
      await expectRevert(validTransition(fromState, toState), TURN_NUM_MUST_INCREMENT);
    });

    it('rejects any transition where the channel changes', async () => {
      toState.channel = otherChannel;
      await expectRevert(validTransition(fromState, toState), CHANNEL_ID_MUST_MATCH);
    });

    it('rejects a transition where the balances changes', async () => {
      toState.allocation = otherallocation;
      await expectRevert(validTransition(fromState, toState), allocationsMustEqual("PreFundSetup"));
    });

    it('rejects a transition where the destination changes', async () => {
      toState.destination = otherDestination;
      await expectRevert(validTransition(fromState, toState), destinationsMustEqual("PreFundSetup"));
    });

    it('rejects a transition not from the last preFundSetup state', async () => {
      fromState.stateCount = 0;
      await expectRevert(validTransition(fromState, toState), stateTypeMustBe("PreFundSetup", "PreFundSetup"));
    });
  });

  describe('PostFundSetup -> PostFundSetup', () => {
    beforeEach(() => {
      fromState = CountingGame.postFundSetupState({ ...defaults, turnNum: 1, stateCount: 0 });
      toState = CountingGame.postFundSetupState({ ...defaults, turnNum: 2, stateCount: 1 });
    });

    it('allows a valid transition', async () => {
      expect(await validTransition(fromState, toState)).toBeTruthy();
    });

    it("rejects a transition where the turnNum doesn't increment", async () => {
      toState.turnNum = fromState.turnNum;
      await expectRevert(validTransition(fromState, toState), TURN_NUM_MUST_INCREMENT);
    });

    it('rejects any transition where the channel changes', async () => {
      toState.channel = otherChannel;
      await expectRevert(validTransition(fromState, toState), CHANNEL_ID_MUST_MATCH);
    });

    it('rejects a transition where the balances changes', async () => {
      toState.allocation = otherallocation;
      await expectRevert(validTransition(fromState, toState), allocationsMustEqual("PostFundSetup"));
    });

    it('rejects a transition where the destination changes', async () => {
      toState.destination = otherDestination;
      await expectRevert(validTransition(fromState, toState), destinationsMustEqual("PostFundSetup"));
    });

    it('rejects a transition from the last PostFundSetup state', async () => {
      fromState.stateCount = 1;
      await expectRevert(validTransition(fromState, toState), stateTypeMustBe("PostFundSetup", "Conclude"));
    });
  });

  describe('PostFundSetup -> Game', () => {
    beforeEach(() => {
      fromState = CountingGame.postFundSetupState({ ...defaults, turnNum: 3, stateCount: 1, gameCounter: 0 });
      toState = CountingGame.gameState({ ...defaults, turnNum: 4, stateCount: 0, gameCounter: 0,  });
    });

    it("rejects a transition where the fromState is not the last player", async () => {
      fromState.stateCount = 0;
      // if the stateCount on fromState is not numParticipants - 1, then the player
      // has to transition to either PostFundSetup or Conclude
      await expectRevert(validTransition(fromState, toState), stateTypeMustBe("PostFundSetup", "Conclude"));
    });
  });

  describe('PostFundSetup -> conclude', () => {
    beforeEach(() => {
      fromState = CountingGame.postFundSetupState({ ...defaults, turnNum: 1, stateCount: 0 });
      toState = CountingGame.concludeState({ ...defaults, turnNum: 2 });
    });

    it("rejects a transition where the turnNum doesn't increment", async () => {
      toState.turnNum = fromState.turnNum;
      await expectRevert(validTransition(fromState, toState));
    });

    it('rejects any transition where the channel changes', async () => {
      toState.channel = otherChannel;
      await expectRevert(validTransition(fromState, toState));
    });

    it("rejects a transition where the count doesn't reset", async () => {
      fromState.stateCount = 1;
      toState.stateCount = 2;
      await expectRevert(validTransition(fromState, toState), stateCountMustReset("PostFundSetup", "Conclude"));
    });

    it('allows a valid transition', async () => {
      expect(await validTransition(fromState, toState)).toBeTruthy();
    });

    it('rejects a transition where the balances changes', async () => {
      toState.allocation = otherallocation;
      await expectRevert(validTransition(fromState, toState));
    });

    it('rejects a transition where the destination changes', async () => {
      toState.destination = otherDestination;
      await expectRevert(validTransition(fromState, toState), destinationsMustEqual("PostFundSetup"));
    });

    it('rejects a transition from the last PostFundSetup state', async () => {
      fromState.stateCount = 1;
      await expectRevert(validTransition(fromState, toState));
    });
  });

  describe('PostFundSetup -> game', () => {
    beforeEach(() => {
      fromState = CountingGame.postFundSetupState({
        ...defaults,
        turnNum: 1,
        stateCount: 1,
        gameCounter: 3,
      });
      toState = CountingGame.gameState({ ...defaults, turnNum: 2, gameCounter: 4 });
    });

    it('allows a valid transition', async () => {
      expect(await validTransition(fromState, toState)).toBeTruthy();
    });

    it("rejects a transition where the turnNum doesn't increment", async () => {
      toState.turnNum = fromState.turnNum;
      await expectRevert(validTransition(fromState, toState));
    });

    it('rejects any transition where the channel changes', async () => {
      toState.channel = otherChannel;
      await expectRevert(validTransition(fromState, toState));
    });

    it('rejects a transition not from the last PostFundSetup state', async () => {
      fromState.stateCount = 0;
      await expectRevert(validTransition(fromState, toState));
    });

    it('rejects a transition where the game rules are broken', async () => {
      toState.gameCounter = 2; // game specifies that counter must increment
      await expectRevert(validTransition(fromState, toState));
    });
  });

  describe('game -> game', () => {
    beforeEach(() => {
      fromState = CountingGame.gameState({ ...defaults, turnNum: 1, gameCounter: 3 });
      toState = CountingGame.gameState({ ...defaults, turnNum: 2, gameCounter: 4 });
    });

    it('allows a valid transition', async () => {
      expect(await validTransition(fromState, toState)).toBeTruthy();
    });

    it("rejects a transition where the turnNum doesn't increment", async () => {
      toState.turnNum = fromState.turnNum;
      await expectRevert(validTransition(fromState, toState));
    });

    it('rejects any transition where the channel changes', async () => {
      toState.channel = otherChannel;
      await expectRevert(validTransition(fromState, toState));
    });

    it('rejects a transition where the game rules are broken', async () => {
      toState.gameCounter = 2; // game specifies that counter must increment
      await expectRevert(validTransition(fromState, toState));
    });
  });

  describe('game -> conclude', () => {
    beforeEach(() => {
      fromState = CountingGame.gameState({ ...defaults, turnNum: 1, gameCounter: 3 });
      toState = CountingGame.concludeState({ ...defaults, turnNum: 2 });
    });

    it('allows a valid transition', async () => {
      expect(await validTransition(fromState, toState)).toBeTruthy();
    });

    it("rejects a transition where the turnNum doesn't increment", async () => {
      toState.turnNum = fromState.turnNum;
      await expectRevert(validTransition(fromState, toState));
    });

    it('rejects any transition where the channel changes', async () => {
      toState.channel = otherChannel;
      await expectRevert(validTransition(fromState, toState));
    });

    it('rejects a transition where the balances changes', async () => {
      toState.allocation = otherallocation;
      await expectRevert(validTransition(fromState, toState));
    });

    it('rejects a transition where the destination changes', async () => {
      toState.destination = otherDestination;
      await expectRevert(validTransition(fromState, toState), destinationsMustEqual("Game"));
    });
  });

  describe('conclude -> conclude', () => {
    beforeEach(() => {
      fromState = CountingGame.concludeState({ ...defaults, turnNum: 1 });
      toState = CountingGame.concludeState({ ...defaults, turnNum: 2 });
    });

    it('allows a valid transition', async () => {
      expect(await validTransition(fromState, toState)).toBeTruthy();
    });

    it("rejects a transition where the turnNum doesn't increment", async () => {
      toState.turnNum = fromState.turnNum;
      await expectRevert(validTransition(fromState, toState));
    });

    it('rejects any transition where the channel changes', async () => {
      toState.channel = otherChannel;
      await expectRevert(validTransition(fromState, toState));
    });

    it('rejects a transition where the balances changes', async () => {
      toState.allocation = otherallocation;
      await expectRevert(validTransition(fromState, toState));
    });

    it('rejects a transition where the destination changes', async () => {
      toState.destination = otherDestination;
      await expectRevert(validTransition(fromState, toState), destinationsMustEqual("Conclude"));
    });
  });
});
