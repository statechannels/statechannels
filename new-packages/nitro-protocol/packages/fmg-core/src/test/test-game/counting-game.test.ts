import expectRevert from '../helpers/expect-revert';
import linker from 'solc/linker';

import { Channel } from '../../';
import { ethers, utils, ContractFactory } from 'ethers';

import StateArtifact from '../../../build/contracts/State.json';

import CountingStateArtifact from '../../../build/contracts/CountingState.json';
import CountingGameArtifact from '../../../build/contracts/CountingGame.json';
import { createState, CountingState, args } from '../../test-game/counting-game';

const provider = new ethers.providers.JsonRpcProvider('http://localhost:8545');
const signer = provider.getSigner();

describe('CountingGame', () => {
  let game;
  let state0: CountingState;
  let state1: CountingState;
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

    const one = utils.bigNumberify(1);
    const two = utils.bigNumberify(2);
    const three = utils.bigNumberify(3); 
    const six = utils.bigNumberify(6);
    const seven = utils.bigNumberify(7);
    state0 = createState.game({ ...defaults, turnNum: six, gameCounter: one, stateCount: one });
    state1 = createState.game({ ...defaults, turnNum: seven, gameCounter: two, stateCount: two });

    stateBalChange = createState.game({
      ...defaults,
      allocation: [six, three],
      turnNum: seven,
      gameCounter: two,
      stateCount: two,
    });
  });

  // Transition fuction tests
  // ========================

  it('allows a move where the count increment', async () => {
    const output = await game.validTransition(args(state0), args(state1));
    expect(output).toBe(true);
  });

  it("doesn't allow transitions if totals don't match", async () => {
    await expectRevert(game.validTransition(args(state0), args(stateBalChange)), "CountingGame: allocations must be equal");
  });
});