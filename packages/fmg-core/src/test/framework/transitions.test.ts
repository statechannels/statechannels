import { ethers, ContractFactory } from 'ethers';
import linker from 'solc/linker';

import expectRevert from '../helpers/expect-revert';

import { createCommitment, args } from '../../test-game/counting-game';
import { Channel } from '../..';

import CommitmentArtifact from '../../../build/contracts/Commitment.json';

import RulesArtifact from '../../../build/contracts/Rules.json';
import TestRulesArtifact from '../../../build/contracts/TestRules.json';

import CountingCommitmentArtifact from '../../../build/contracts/CountingCommitment.json';
import CountingGameArtifact from '../../../build/contracts/CountingGame.json';

const provider = new ethers.providers.JsonRpcProvider('http://localhost:8545');
const signer = provider.getSigner();

const TURN_NUM_MUST_INCREMENT = "turnNum must increase by 1";
const CHANNEL_ID_MUST_MATCH = "channelId must match";
const allocationsMustEqual = (commitmentType) => `${commitmentType}: allocations must be equal`;
const destinationsMustEqual = (commitmentType) => `${commitmentType}: destinations must be equal`;
const gameAttributesMustMatch = (commitmentType) => `${commitmentType}: gameAttributes must be equal`;
const commitmentCountMustIncrement = (commitmentType) => `${commitmentType}: commitmentCount must increase by 1`;
const commitmentCountMustReset = (commitmentType, nextCommitmentType) => `${commitmentType}: commitmentCount must be reset when transitioning to ${nextCommitmentType}`;
const commitmentTypeMustBe = (commitmentType, nextCommitmentType) => `${commitmentType}: commitmentType must be ${nextCommitmentType}`;

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

  let fromCommitment;
  let toCommitment;


  beforeAll(async () => {
    // Contract setup --------------------------------------------------------------------------
    const networkId = (await provider.getNetwork()).chainId;
    CountingCommitmentArtifact.bytecode = linker.linkBytecode(CountingCommitmentArtifact.bytecode, {
      Commitment: CommitmentArtifact.networks[networkId].address,
    });

    CountingGameArtifact.bytecode = linker.linkBytecode(CountingGameArtifact.bytecode, {
      CountingCommitment: CountingCommitmentArtifact.networks[networkId].address,
    });
    const gameContract = await ContractFactory.fromSolidity(CountingGameArtifact, signer).attach(
      CountingGameArtifact.networks[networkId].address,
    );

    otherChannel = new Channel(gameContract.address, 1, participants);

    RulesArtifact.bytecode = linker.linkBytecode(RulesArtifact.bytecode, {
      Commitment: CommitmentArtifact.networks[networkId].address,
    });

    TestRulesArtifact.bytecode = linker.linkBytecode(TestRulesArtifact.bytecode, { "Commitment": CommitmentArtifact.networks[networkId].address });
    TestRulesArtifact.bytecode = linker.linkBytecode(TestRulesArtifact.bytecode, { "Rules": RulesArtifact.networks[networkId].address });
    testFramework = await ContractFactory.fromSolidity(TestRulesArtifact, signer).deploy();
    // Contract setup --------------------------------------------------------------------------

    channel = new Channel(gameContract.address, 0, participants);
    defaults = { channel, allocation, destination, gameCounter: 0 };
  });

  const validTransition = async (commitment1, commitment2) => {
    return await testFramework.validTransition(args(commitment1), args(commitment2));
  };

  describe('preFundSetup -> preFundSetup', () => {
    beforeEach(() => {
      fromCommitment = createCommitment.preFundSetup({ ...defaults, turnNum: 0, commitmentCount: 0 });
      toCommitment = createCommitment.preFundSetup({ ...defaults, turnNum: 1, commitmentCount: 1 });
    });

    it('allows a valid transition', async () => {
      expect(await validTransition(fromCommitment, toCommitment)).toEqual(true);
    });

    it("rejects a transition where the turnNum doesn't increment", async () => {
      toCommitment.turnNum = fromCommitment.turnNum;
      await expectRevert(validTransition(fromCommitment, toCommitment), TURN_NUM_MUST_INCREMENT); // passes
    });

    it('rejects any transition where the channel changes', async () => {
      toCommitment.channel = otherChannel;
      await expectRevert(validTransition(fromCommitment, toCommitment), CHANNEL_ID_MUST_MATCH);
    });

    it('rejects a transition where the balances changes', async () => {
      toCommitment.allocation = otherallocation;
      await expectRevert(validTransition(fromCommitment, toCommitment), allocationsMustEqual("PreFundSetup"));
    });

    it('rejects a transition where the destination changes', async () => {
      toCommitment.destination = otherDestination;
      await expectRevert(validTransition(fromCommitment, toCommitment), destinationsMustEqual("PreFundSetup"));
    });

    it("rejects a transition where the count doesn't increment", async () => {
      toCommitment.commitmentCount = fromCommitment.commitmentCount;
      await expectRevert(validTransition(fromCommitment, toCommitment), commitmentCountMustIncrement("PreFundSetup"));
    });
    it('rejects a transition where the game attributes changes', async () => {
      toCommitment.gameCounter = 45;
      await expectRevert(validTransition(fromCommitment, toCommitment), gameAttributesMustMatch("PreFundSetup"));
    });
  });

  describe('preFundSetup -> PostFundSetup', () => {
    beforeEach(() => {
      fromCommitment = createCommitment.preFundSetup({ ...defaults, turnNum: 1, commitmentCount: 1 });
      toCommitment = createCommitment.postFundSetup({ ...defaults, turnNum: 2, commitmentCount: 0 });
    });

    it('allows a valid transition', async () => {
      expect(await validTransition(fromCommitment, toCommitment)).toBeTruthy();
    });

    it("rejects a transition where the turnNum doesn't increment", async () => {
      toCommitment.turnNum = fromCommitment.turnNum;
      await expectRevert(validTransition(fromCommitment, toCommitment), TURN_NUM_MUST_INCREMENT);
    });

    it('rejects any transition where the channel changes', async () => {
      toCommitment.channel = otherChannel;
      await expectRevert(validTransition(fromCommitment, toCommitment), CHANNEL_ID_MUST_MATCH);
    });

    it('rejects a transition not from the last preFundSetup Commitment', async () => {
      fromCommitment.commitmentCount = 0;
      await expectRevert(validTransition(fromCommitment, toCommitment), commitmentTypeMustBe("PreFundSetup", "PreFundSetup"));
    });

    it('rejects a transition where the balances changes', async () => {
      toCommitment.allocation = otherallocation;
      await expectRevert(validTransition(fromCommitment, toCommitment), allocationsMustEqual("PreFundSetup"));
    });

    it('rejects a transition where the destination changes', async () => {
      toCommitment.destination = otherDestination;
      await expectRevert(validTransition(fromCommitment, toCommitment), destinationsMustEqual("PreFundSetup"));
    });

    it("rejects a transition where the count doesn't reset", async () => {
      toCommitment.commitmentCount = 2;
      await expectRevert(validTransition(fromCommitment, toCommitment), commitmentCountMustReset("PreFundSetup", "PostFundSetup"));
    });

    it('rejects a transition where the position changes', async () => {
      toCommitment.gameCounter = 45;
      await expectRevert(validTransition(fromCommitment, toCommitment), gameAttributesMustMatch("PreFundSetup"));
    });
  });

  describe('preFundSetup -> conclude', () => {
    beforeEach(() => {
      fromCommitment = createCommitment.preFundSetup({ ...defaults, turnNum: 1, commitmentCount: 1 });
      toCommitment = createCommitment.conclude({ ...defaults, turnNum: 2, commitmentCount: 2 });
    });

    it('allows a valid transition', async () => {
      expect(await validTransition(fromCommitment, toCommitment)).toBeTruthy();
    });

    it("rejects a transition where the turnNum doesn't increment", async () => {
      toCommitment.turnNum = fromCommitment.turnNum;
      await expectRevert(validTransition(fromCommitment, toCommitment), TURN_NUM_MUST_INCREMENT);
    });

    it('rejects any transition where the channel changes', async () => {
      toCommitment.channel = otherChannel;
      await expectRevert(validTransition(fromCommitment, toCommitment), CHANNEL_ID_MUST_MATCH);
    });

    it('rejects a transition where the balances changes', async () => {
      toCommitment.allocation = otherallocation;
      await expectRevert(validTransition(fromCommitment, toCommitment), allocationsMustEqual("PreFundSetup"));
    });

    it('rejects a transition where the destination changes', async () => {
      toCommitment.destination = otherDestination;
      await expectRevert(validTransition(fromCommitment, toCommitment), destinationsMustEqual("PreFundSetup"));
    });

    it('rejects a transition not from the last preFundSetup Commitment', async () => {
      fromCommitment.commitmentCount = 0;
      await expectRevert(validTransition(fromCommitment, toCommitment), commitmentTypeMustBe("PreFundSetup", "PreFundSetup"));
    });
  });

  describe('PostFundSetup -> PostFundSetup', () => {
    beforeEach(() => {
      fromCommitment = createCommitment.postFundSetup({ ...defaults, turnNum: 1, commitmentCount: 0 });
      toCommitment = createCommitment.postFundSetup({ ...defaults, turnNum: 2, commitmentCount: 1 });
    });

    it('allows a valid transition', async () => {
      expect(await validTransition(fromCommitment, toCommitment)).toBeTruthy();
    });

    it("rejects a transition where the turnNum doesn't increment", async () => {
      toCommitment.turnNum = fromCommitment.turnNum;
      await expectRevert(validTransition(fromCommitment, toCommitment), TURN_NUM_MUST_INCREMENT);
    });

    it('rejects any transition where the channel changes', async () => {
      toCommitment.channel = otherChannel;
      await expectRevert(validTransition(fromCommitment, toCommitment), CHANNEL_ID_MUST_MATCH);
    });

    it('rejects a transition where the balances changes', async () => {
      toCommitment.allocation = otherallocation;
      await expectRevert(validTransition(fromCommitment, toCommitment), allocationsMustEqual("PostFundSetup"));
    });

    it('rejects a transition where the destination changes', async () => {
      toCommitment.destination = otherDestination;
      await expectRevert(validTransition(fromCommitment, toCommitment), destinationsMustEqual("PostFundSetup"));
    });

    it('rejects a transition from the last PostFundSetup Commitment', async () => {
      fromCommitment.commitmentCount = 1;
      await expectRevert(validTransition(fromCommitment, toCommitment), commitmentTypeMustBe("PostFundSetup", "Conclude"));
    });
  });

  describe('PostFundSetup -> Game', () => {
    beforeEach(() => {
      fromCommitment = createCommitment.postFundSetup({ ...defaults, turnNum: 3, commitmentCount: 1, gameCounter: 0 });
      toCommitment = createCommitment.game({ ...defaults, turnNum: 4, commitmentCount: 0, gameCounter: 0,  });
    });

    it("rejects a transition where the fromCommitment is not the last player", async () => {
      fromCommitment.commitmentCount = 0;
      // if the commitmentCount on fromCommitment is not numParticipants - 1, then the player
      // has to transition to either PostFundSetup or Conclude
      await expectRevert(validTransition(fromCommitment, toCommitment), commitmentTypeMustBe("PostFundSetup", "Conclude"));
    });
  });

  describe('PostFundSetup -> conclude', () => {
    beforeEach(() => {
      fromCommitment = createCommitment.postFundSetup({ ...defaults, turnNum: 1, commitmentCount: 0 });
      toCommitment = createCommitment.conclude({ ...defaults, turnNum: 2, commitmentCount: 1 });
    });

    it("rejects a transition where the turnNum doesn't increment", async () => {
      toCommitment.turnNum = fromCommitment.turnNum;
      await expectRevert(validTransition(fromCommitment, toCommitment));
    });

    it('rejects any transition where the channel changes', async () => {
      toCommitment.channel = otherChannel;
      await expectRevert(validTransition(fromCommitment, toCommitment));
    });

    it("rejects a transition where the count doesn't reset", async () => {
      fromCommitment.commitmentCount = 1;
      toCommitment.commitmentCount = 2;
      await expectRevert(validTransition(fromCommitment, toCommitment), commitmentCountMustReset("PostFundSetup", "Conclude"));
    });

    it('allows a valid transition', async () => {
      expect(await validTransition(fromCommitment, toCommitment)).toBeTruthy();
    });

    it('rejects a transition where the balances changes', async () => {
      toCommitment.allocation = otherallocation;
      await expectRevert(validTransition(fromCommitment, toCommitment));
    });

    it('rejects a transition where the destination changes', async () => {
      toCommitment.destination = otherDestination;
      await expectRevert(validTransition(fromCommitment, toCommitment), destinationsMustEqual("PostFundSetup"));
    });

    it('rejects a transition from the last PostFundSetup Commitment', async () => {
      fromCommitment.commitmentCount = 1;
      await expectRevert(validTransition(fromCommitment, toCommitment));
    });
  });

  describe('PostFundSetup -> game', () => {
    beforeEach(() => {
      fromCommitment = createCommitment.postFundSetup({
        ...defaults,
        turnNum: 1,
        commitmentCount: 1,
        gameCounter: 3,
      });
      toCommitment = createCommitment.game({ ...defaults, turnNum: 2, gameCounter: 4, commitmentCount: 0 });
    });

    it('allows a valid transition', async () => {
      expect(await validTransition(fromCommitment, toCommitment)).toBeTruthy();
    });

    it("rejects a transition where the turnNum doesn't increment", async () => {
      toCommitment.turnNum = fromCommitment.turnNum;
      await expectRevert(validTransition(fromCommitment, toCommitment));
    });

    it('rejects any transition where the channel changes', async () => {
      toCommitment.channel = otherChannel;
      await expectRevert(validTransition(fromCommitment, toCommitment));
    });

    it('rejects a transition not from the last PostFundSetup Commitment', async () => {
      fromCommitment.commitmentCount = 0;
      await expectRevert(validTransition(fromCommitment, toCommitment));
    });

    it('rejects a transition where the game rules are broken', async () => {
      toCommitment.gameCounter = 2; // game specifies that counter must increment
      await expectRevert(validTransition(fromCommitment, toCommitment));
    });
  });

  describe('game -> game', () => {
    beforeEach(() => {
      fromCommitment = createCommitment.game({ ...defaults, turnNum: 1, gameCounter: 3, commitmentCount: 0 });
      toCommitment = createCommitment.game({ ...defaults, turnNum: 2, gameCounter: 4, commitmentCount: 0 });
    });

    it('allows a valid transition', async () => {
      expect(await validTransition(fromCommitment, toCommitment)).toBeTruthy();
    });

    it("rejects a transition where the turnNum doesn't increment", async () => {
      toCommitment.turnNum = fromCommitment.turnNum;
      await expectRevert(validTransition(fromCommitment, toCommitment));
    });

    it('rejects any transition where the channel changes', async () => {
      toCommitment.channel = otherChannel;
      await expectRevert(validTransition(fromCommitment, toCommitment));
    });

    it('rejects a transition where the game rules are broken', async () => {
      toCommitment.gameCounter = 2; // game specifies that counter must increment
      await expectRevert(validTransition(fromCommitment, toCommitment));
    });
  });

  describe('game -> conclude', () => {
    beforeEach(() => {
      fromCommitment = createCommitment.game({ ...defaults, turnNum: 1, gameCounter: 3, commitmentCount: 0 });
      toCommitment = createCommitment.conclude({ ...defaults, turnNum: 2, commitmentCount: 0 });
    });

    it('allows a valid transition', async () => {
      expect(await validTransition(fromCommitment, toCommitment)).toBeTruthy();
    });

    it("rejects a transition where the turnNum doesn't increment", async () => {
      toCommitment.turnNum = fromCommitment.turnNum;
      await expectRevert(validTransition(fromCommitment, toCommitment));
    });

    it('rejects any transition where the channel changes', async () => {
      toCommitment.channel = otherChannel;
      await expectRevert(validTransition(fromCommitment, toCommitment));
    });

    it('rejects a transition where the balances changes', async () => {
      toCommitment.allocation = otherallocation;
      await expectRevert(validTransition(fromCommitment, toCommitment));
    });

    it('rejects a transition where the destination changes', async () => {
      toCommitment.destination = otherDestination;
      await expectRevert(validTransition(fromCommitment, toCommitment), destinationsMustEqual("Game"));
    });
  });

  describe('conclude -> conclude', () => {
    beforeEach(() => {
      fromCommitment = createCommitment.conclude({ ...defaults, turnNum: 1, commitmentCount: 1 });
      toCommitment = createCommitment.conclude({ ...defaults, turnNum: 2, commitmentCount: 2 });
    });

    it('allows a valid transition', async () => {
      expect(await validTransition(fromCommitment, toCommitment)).toBeTruthy();
    });

    it("rejects a transition where the turnNum doesn't increment", async () => {
      toCommitment.turnNum = fromCommitment.turnNum;
      await expectRevert(validTransition(fromCommitment, toCommitment));
    });

    it('rejects any transition where the channel changes', async () => {
      toCommitment.channel = otherChannel;
      await expectRevert(validTransition(fromCommitment, toCommitment));
    });

    it('rejects a transition where the balances changes', async () => {
      toCommitment.allocation = otherallocation;
      await expectRevert(validTransition(fromCommitment, toCommitment));
    });

    it('rejects a transition where the destination changes', async () => {
      toCommitment.destination = otherDestination;
      await expectRevert(validTransition(fromCommitment, toCommitment), destinationsMustEqual("Conclude"));
    });
  });
});
