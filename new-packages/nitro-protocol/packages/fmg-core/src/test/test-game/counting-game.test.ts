import { CountingGame } from '../../test-game/counting-game';
import expectRevert from '../helpers/expect-revert';
import linker from 'solc/linker';

import { Channel } from '../../';
import BN from 'bn.js';
import { ethers, utils, ContractFactory } from 'ethers';

import StateArtifact from '../../../build/contracts/State.json';

import CountingStateArtifact from '../../../build/contracts/CountingState.json';
import CountingGameArtifact from '../../../build/contracts/CountingGame.json';

const provider = new ethers.providers.JsonRpcProvider('http://localhost:8545');
const signer = provider.getSigner();

describe('CountingGame', () => {
  let game;
  let state0;
  let state1;
  let stateBalChange;

  beforeAll(async () => {
    // Contract setup --------------------------------------------------------------------------
    const networkId = (await provider.getNetwork()).chainId;
    CountingStateArtifact.bytecode = linker.linkBytecode(CountingStateArtifact.bytecode, {
      State: StateArtifact.networks[networkId].address,
    });

    CountingGameArtifact.bytecode = linker.linkBytecode(CountingGameArtifact.bytecode, {
      CountingState: CountingStateArtifact.networks[networkId].address,
    });
    game = await ContractFactory.fromSolidity(CountingGameArtifact, signer).attach(
      CountingGameArtifact.networks[networkId].address,
    );
    // Contract setup --------------------------------------------------------------------------

    const participantA = new ethers.Wallet(
      '6cbed15c793ce57650b9877cf6fa156fbef513c4e6134f022a85b1ffdd59b2a1',
    );
    const participantB = new ethers.Wallet(
      '6370fd033278c143179d81c5526140625662b8daa446c22ee2d73db3707e620c',
    );
    const participants = [participantA.address, participantB.address];


    const channel = new Channel(game.address, 0, participants);
    
    const defaults = {
      channel,
      allocation: [new utils.BigNumber(5), new utils.BigNumber(4)],
      destination: [participantA.address, participantB.address],
    };

    state0 = CountingGame.gameState({ ...defaults, turnNum: 6, gameCounter: 1 });
    state1 = CountingGame.gameState({ ...defaults, turnNum: 7, gameCounter: 2 });

    stateBalChange = CountingGame.gameState({
      ...defaults,
      allocation: [new utils.BigNumber(6), new utils.BigNumber(3)],
      turnNum: 7,
      gameCounter: 2,
    });
  });

  // Transition fuction tests
  // ========================

  it('allows a move where the count increment', async () => {
    const output = await game.validTransition(state0.args, state1.args);
    expect(output).toBe(true);
  });

  // it("allows START -> CONCLUDED if totals match", async () => {
  //   var output = await game.validTransition.call(start, allowedConcluded);
  //   assert.equal(output, true);
  // });

  it("doesn't allow transitions if totals don't match", async () => {
    await expectRevert(game.validTransition(state0.args, stateBalChange.args), "CountingGame: allocations must be equal");
  });
});