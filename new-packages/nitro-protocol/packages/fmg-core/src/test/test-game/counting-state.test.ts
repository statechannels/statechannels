import { CountingGame } from '../../test-game/counting-game';
import linker from 'solc/linker';

import { Channel } from '../../';
import { ethers, ContractFactory, utils } from 'ethers';

import StateArtifact from '../../../build/contracts/State.json';

import CountingStateArtifact from '../../../build/contracts/CountingState.json';
import TestCountingStateArtifact from '../../../build/contracts/TestCountingState.json';

const provider = new ethers.providers.JsonRpcProvider('http://localhost:8545');
const signer = provider.getSigner();

describe('CountingState', () => {
  let testCountingState;
  let state;

  beforeAll(async () => {
    // Contract setup --------------------------------------------------------------------------
    const networkId = (await provider.getNetwork()).chainId;
    CountingStateArtifact.bytecode = linker.linkBytecode(CountingStateArtifact.bytecode, {
      State: StateArtifact.networks[networkId].address,
    });

    TestCountingStateArtifact.bytecode = linker.linkBytecode(TestCountingStateArtifact.bytecode, {
        CountingState: CountingStateArtifact.networks[networkId].address,
    });

    TestCountingStateArtifact.bytecode = linker.linkBytecode(TestCountingStateArtifact.bytecode, {
        State: StateArtifact.networks[networkId].address,
    });

    testCountingState = await ContractFactory.fromSolidity(TestCountingStateArtifact, signer).deploy();

    // Contract setup --------------------------------------------------------------------------

    const participantA = new ethers.Wallet(
      '6cbed15c793ce57650b9877cf6fa156fbef513c4e6134f022a85b1ffdd59b2a1',
    );
    const participantB = new ethers.Wallet(
      '6370fd033278c143179d81c5526140625662b8daa446c22ee2d73db3707e620c',
    );
    const participants = [participantA.address, participantB.address];


    const channel = new Channel(participantB.address, 0, participants); // just use any valid address
    
    const defaults = {
      channel,
      allocation: [new utils.BigNumber(5), new utils.BigNumber(4)],
      destination: [participantA.address, participantB.address],
    };

    state = CountingGame.gameState({ ...defaults, turnNum: 6, gameCounter: 1 });
  });

  it('converts a framework state into a counting state', async () => {
    const countingStateArgs = await testCountingState.fromFrameworkState(state.args);
    const gameAttributes = CountingGame.gameAttributes(countingStateArgs);

    expect(gameAttributes).toMatchObject({
        gameCounter: new utils.BigNumber(1),
    });
  });
});
