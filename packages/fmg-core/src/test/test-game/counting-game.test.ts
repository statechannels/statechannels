import expectRevert from '../helpers/expect-revert';
import linker from 'solc/linker';

import { Channel } from '../../';
import { ethers, utils, ContractFactory } from 'ethers';

import CommitmentArtifact from '../../../build/contracts/Commitment.json';

import CountingCommitmentArtifact from '../../../build/contracts/CountingCommitment.json';
import CountingGameArtifact from '../../../build/contracts/CountingGame.json';
import { createCommitment, CountingCommitment, args } from '../../test-game/counting-game';

const provider = new ethers.providers.JsonRpcProvider('http://localhost:8545');
const signer = provider.getSigner();

describe('CountingGame', () => {
  let game;
  let commitment0: CountingCommitment;
  let commitment1: CountingCommitment;
  let commitmentBalChange;

  beforeAll(async () => {
    // Contract setup --------------------------------------------------------------------------
    const networkId = (await provider.getNetwork()).chainId;
    CountingCommitmentArtifact.bytecode = linker.linkBytecode(CountingCommitmentArtifact.bytecode, {
      Commitment: CommitmentArtifact.networks[networkId].address,
    });

    CountingGameArtifact.bytecode = linker.linkBytecode(CountingGameArtifact.bytecode, {
      CountingCommitment: CountingCommitmentArtifact.networks[networkId].address,
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
    commitment0 = createCommitment.game({ ...defaults, turnNum: six, gameCounter: one, commitmentCount: one });
    commitment1 = createCommitment.game({ ...defaults, turnNum: seven, gameCounter: two, commitmentCount: two });

    commitmentBalChange = createCommitment.game({
      ...defaults,
      allocation: [six, three],
      turnNum: seven,
      gameCounter: two,
      commitmentCount: two,
    });
  });

  // Transition fuction tests
  // ========================

  it('allows a move where the count increment', async () => {
    const output = await game.validTransition(args(commitment0), args(commitment1));
    expect(output).toBe(true);
  });

  it("doesn't allow transitions if totals don't match", async () => {
    await expectRevert(game.validTransition(args(commitment0), args(commitmentBalChange)), "CountingGame: allocations must be equal");
  });
});