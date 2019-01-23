import { ContractFactory, ethers } from 'ethers';
import linker from 'solc/linker';
import {
  getNetworkId,
  getGanacheProvider,
} from 'magmo-devtools';
import { Channel } from 'fmg-core';

import StateArtifact from '../build/contracts/State.json';
import ConsensusStateArtifact from '../build/contracts/ConsensusState.json';
import TestConsensusStateArtifact from '../build/contracts/TestConsensusState.json';

import { ConsensusGame } from '../src/consensus-game';

jest.setTimeout(20000);
let consensusState: ethers.Contract;
const provider = getGanacheProvider();
const providerSigner = provider.getSigner();

async function setupContracts() {
  const networkId = await getNetworkId();

  ConsensusStateArtifact.bytecode = linker.linkBytecode(
    ConsensusStateArtifact.bytecode,
    { State: StateArtifact.networks[networkId].address },
  );

  TestConsensusStateArtifact.bytecode = linker.linkBytecode(
    TestConsensusStateArtifact.bytecode,
    { State: StateArtifact.networks[networkId].address },
  );

  TestConsensusStateArtifact.bytecode = linker.linkBytecode(
    TestConsensusStateArtifact.bytecode,
    { ConsensusState: ConsensusStateArtifact.networks[networkId].address },
  );

  consensusState = await ContractFactory.fromSolidity(TestConsensusStateArtifact, providerSigner).deploy();
  await consensusState.deployed();
}

describe('ConsensusState', () => {
  const participantA = new ethers.Wallet(
    '6cbed15c793ce57650b9877cf6fa156fbef513c4e6134f022a85b1ffdd59b2a1',
  );
  const participantB = new ethers.Wallet(
    '6370fd033278c143179d81c5526140625662b8daa446c22ee2d73db3707e620c',
  );
  const participants = [participantA.address, participantB.address];
  const proposedDestination = [participantB.address];

  const allocation = [new ethers.utils.BigNumber(5), new ethers.utils.BigNumber(4)];
  const proposedAllocation = [new ethers.utils.BigNumber(9)];

  const channel = new Channel(participantB.address, 0, participants); // just use any valid address
  const defaults = { channel, allocation, destination: participants };
  const state = ConsensusGame.gameState({ ...defaults, turnNum: 6, consensusCounter: 1, proposedAllocation, proposedDestination, });

 it('works', async () => {
    await setupContracts();
    const consensusStateAttrs = await consensusState.fromFrameworkState(state.args);

    expect(consensusStateAttrs).toMatchObject({
        numberOfParticipants: new ethers.utils.BigNumber(2),
        consensusCounter: new ethers.utils.BigNumber(1),
        currentAllocation: allocation,
        currentDestination: participants,
        proposedAllocation,
        proposedDestination,
    });
  });
});