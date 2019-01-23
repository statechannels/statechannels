import { ContractFactory, ethers } from 'ethers';
import linker from 'solc/linker';
import {
  getNetworkId,
  getGanacheProvider,
  assertRevert,
  delay,
} from 'magmo-devtools';
import { Channel } from 'fmg-core';

import StateArtifact from '../build/contracts/State.json';
import RulesArtifact from '../build/contracts/Rules.json';
import ConsensusStateArtifact from '../build/contracts/ConsensusState.json';
import ConsensusGameArtifact from '../build/contracts/ConsensusGame.json';

import { ConsensusGame } from '../src/consensus-game';
import { BigNumber } from 'ethers/utils';

jest.setTimeout(20000);
let consensusGame: ethers.Contract;
const provider = getGanacheProvider();
const providerSigner = provider.getSigner();

async function setupContracts() {
  const networkId = await getNetworkId();

  ConsensusStateArtifact.bytecode = linker.linkBytecode(
    ConsensusStateArtifact.bytecode,
    { State: StateArtifact.networks[networkId].address },
  );

  ConsensusGameArtifact.bytecode = linker.linkBytecode(
    ConsensusGameArtifact.bytecode,
    {
      State: StateArtifact.networks[networkId].address,
      Rules: RulesArtifact.networks[networkId].address,
      ConsensusState: ConsensusStateArtifact.networks[networkId].address,
    }
  );

  consensusGame = await ContractFactory.fromSolidity(ConsensusGameArtifact, providerSigner).deploy();
  await consensusGame.deployed();
}

describe('ConsensusGame', () => {
  afterEach(async () => {
    await delay(); // ensure that asserted reverts are captured before the jest test exits
  });

  const participantA = new ethers.Wallet(
    '6cbed15c793ce57650b9877cf6fa156fbef513c4e6134f022a85b1ffdd59b2a1',
  );
  const participantB = new ethers.Wallet(
    '6370fd033278c143179d81c5526140625662b8daa446c22ee2d73db3707e620c',
  );
  const participantC = new ethers.Wallet(
    '5e1b32fb763f62e1d19a9c9cd8c5417bd31b7d697ee018a8afe3cac2292fdd3e'
  );
  const participants = [participantA.address, participantB.address, participantC.address];
  const NUM_PARTICIPANTS = participants.length;
  const proposedDestination = [participantA.address, participantB.address];

  const allocation = [new BigNumber(1), new BigNumber(2), new BigNumber(3)];
  const proposedAllocation = [new BigNumber(4), new BigNumber(2)];

  const channel = new Channel(participantB.address, 0, participants); // just use any valid address
  const defaults = { channel, allocation, destination: participants, turnNum: 6, proposedDestination, proposedAllocation };

  beforeAll(async () => {
    await setupContracts();
  });

  it.skip('reverts when the proposed allocation and the proposed destination are the incorrect length', async () => {
    // I think this test should fail, since this requirement prevents
    // the nitro protocol
    const fromState = ConsensusGame.gameState({
      ...defaults,
      turnNum: 6,
      consensusCounter: 0,
    });
    const toState = ConsensusGame.gameState({
      ...defaults,
       allocation: proposedAllocation,
       destination: participants,
       turnNum: 6,
       consensusCounter: 1,
       proposedAllocation: [new BigNumber(1), new BigNumber(2)],
       proposedDestination: [participantA.address], 
    });
    assertRevert(
      consensusGame.validTransition(fromState.args, toState.args),
      "ConsensusGame: newState.proposedAllocation.length must match newState.proposedDestination.length"
    );
  });

  it('reverts when the consensusCount does not increment and is not reset', async () => {
    const fromState = ConsensusGame.gameState({
      ...defaults,
      turnNum: 6,
      consensusCounter: 0,
    });
    const toState = ConsensusGame.gameState({
      ...defaults,
       turnNum: 6,
       consensusCounter: 2,

    });
    assertRevert(
      consensusGame.validTransition(fromState.args, toState.args),
      "ConsensusGame: Invalid input -- consensus counters out of range"
    );
  });

  describe('when the consensus round has finished', () => {
    const fromState = ConsensusGame.gameState({
      ...defaults,
      turnNum: 6,
      consensusCounter: NUM_PARTICIPANTS - 1,
    });
    const toStateArgs = {
      ...defaults,
      allocation: proposedAllocation,
      destination: proposedDestination,
      turnNum: 6,
      consensusCounter: 0,
    };

    it('returns true when the current balances have properly been set', async () => {
      const toState = ConsensusGame.gameState(toStateArgs);
      expect(await consensusGame.validTransition(fromState.args, toState.args)).toBe(true);
    });

    it('reverts when the consensusCounter is not reset', async () => {
      const toState = ConsensusGame.gameState({
        ...toStateArgs,
        consensusCounter: 1,
      });

      assertRevert(
        consensusGame.validTransition(fromState.args, toState.args),
        "ConsensusGame: consensus counter must be reset at the end of the consensus round"
      );
    });

    it('reverts when the new state\'s proposed allocation does not match the new state\'s current allocation ', async () => {
      const toState = ConsensusGame.gameState({
        ...toStateArgs,
        allocation: [new BigNumber(99)],
        destination: [participantA.address],
      });

      assertRevert(
        consensusGame.validTransition(fromState.args, toState.args),
        "ConsensusGame: newState.currentAllocation must match newState.proposedAllocation at the end of the consensus round"
      );
    });
    it('reverts when the new state\'s proposed destination does not match the new state\'s current destination ', async () => {
      const toState = ConsensusGame.gameState({
        ...toStateArgs,
        destination: participants,
      });

      assertRevert(
        consensusGame.validTransition(fromState.args, toState.args),
        "ConsensusGame: newState.currentDestination must match newState.proposedDestination at the end of the consensus round"
      );
    });
  });

  describe('when the consensus round is ongoing and the counter was not reset', () => {
    const fromState = ConsensusGame.gameState({
      ...defaults,
      consensusCounter: 0,
    });
    const toStateArgs = {
      ...defaults,
      consensusCounter: 1,
    };
    it('returns true when the consensus round is ongoing and the proposed balances haven\'t changed', async () => {
      const toState = ConsensusGame.gameState(toStateArgs);
      expect(await consensusGame.validTransition(fromState.args, toState.args)).toBe(true);
    });

    it('reverts when the currentAllocation changes', async () => {
      const toState = ConsensusGame.gameState({
        ...toStateArgs,
        allocation: [new BigNumber(99)],
        destination: [participantA.address],
      });

      assertRevert(
        consensusGame.validTransition(fromState.args, toState.args),
        "ConsensusGame: currentAllocations must match during consensus round"
      );
    });
    it('reverts when the currentDestination changes', async () => {
      const toState = ConsensusGame.gameState({
        ...toStateArgs,
        allocation,
        destination: [participantB.address, participantA.address, participantC.address],
      });

      assertRevert(
        consensusGame.validTransition(fromState.args, toState.args),
        "ConsensusGame: currentDestinations must match during consensus round"
      );
    });

    it('reverts when the proposedAllocation changes', async () => {
      const toState = ConsensusGame.gameState({
        ...toStateArgs,
        proposedAllocation: [new BigNumber(99), new BigNumber(88)],
      });

      assertRevert(
        consensusGame.validTransition(fromState.args, toState.args),
        "ConsensusGame: proposedAllocations must match during consensus round"
      );
    });

    it('reverts when the proposedDestination changes', async () => {
      const toState = ConsensusGame.gameState({
        ...toStateArgs,
        proposedDestination: [participantB.address, participantA.address],
      });

      assertRevert(
        consensusGame.validTransition(fromState.args, toState.args),
        "ConsensusGame: proposedDestinations must match during consensus round"
      );
    });
  });

  describe('when the consensus round is ongoing and the counter was reset', () => {
    const fromState = ConsensusGame.gameState({
      ...defaults,
      consensusCounter: 1,
    });
    const toStateArgs = {
      ...defaults,
      consensusCounter: 0,
    };
    it('returns true when the consensus round is reset before the end of the round', async () => {
      const toState = ConsensusGame.gameState(toStateArgs);
      expect(await consensusGame.validTransition(fromState.args, toState.args)).toBe(true);
    });

    it('reverts when the currentAllocation changes', async () => {
      const toState = ConsensusGame.gameState({
        ...toStateArgs,
        allocation: proposedAllocation,
      });

      assertRevert(
        consensusGame.validTransition(fromState.args, toState.args),
        "CountingGame: currentAllocations must be equal when resetting the consensusCounter before the end of the round"
      );
    });
    it('reverts when the currentDestination changes', async () => {
      const toState = ConsensusGame.gameState({
        ...toStateArgs,
        allocation,
        destination: [participantB.address, participantA.address, participantC.address],
      });

      assertRevert(
        consensusGame.validTransition(fromState.args, toState.args),
        "CountingGame: currentDestinations must be equal when resetting the consensusCounter before the end of the round"
      );
    });
  });
});