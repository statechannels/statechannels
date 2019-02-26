import linker from 'solc/linker';

import { Channel } from '../../';
import { ethers, ContractFactory, } from 'ethers';

import CommitmentArtifact from '../../../build/contracts/Commitment.json';

import CountingCommitmentArtifact from '../../../build/contracts/CountingCommitment.json';
import TestCountingCommitmentArtifact from '../../../build/contracts/TestCountingCommitment.json';
import { CommitmentType, Commitment, ethereumArgs } from '../../commitment';
import { CountingCommitment, asCoreCommitment } from '../../test-app/counting-app';
import { BigNumber } from 'ethers/utils';

const provider = new ethers.providers.JsonRpcProvider('http://localhost:8545');
const signer = provider.getSigner();

describe('CountingCommitment', () => {
  let testCountingCommitment;
  let commitment: CountingCommitment;

  beforeAll(async () => {
    // Contract setup --------------------------------------------------------------------------
    const networkId = (await provider.getNetwork()).chainId;
    CountingCommitmentArtifact.bytecode = linker.linkBytecode(CountingCommitmentArtifact.bytecode, {
      Commitment: CommitmentArtifact.networks[networkId].address,
    });

    TestCountingCommitmentArtifact.bytecode = linker.linkBytecode(TestCountingCommitmentArtifact.bytecode, {
      CountingCommitment: CountingCommitmentArtifact.networks[networkId].address,
    });

    TestCountingCommitmentArtifact.bytecode = linker.linkBytecode(TestCountingCommitmentArtifact.bytecode, {
      Commitment: CommitmentArtifact.networks[networkId].address,
    });

    testCountingCommitment = await ContractFactory.fromSolidity(TestCountingCommitmentArtifact, signer).deploy();

    // Contract setup --------------------------------------------------------------------------

    const participantA = new ethers.Wallet(
      '6cbed15c793ce57650b9877cf6fa156fbef513c4e6134f022a85b1ffdd59b2a1',
    );
    const participantB = new ethers.Wallet(
      '6370fd033278c143179d81c5526140625662b8daa446c22ee2d73db3707e620c',
    );
    const participants = [participantA.address, participantB.address];


    const channel: Channel = { channelType: participantB.address, channelNonce: 0, participants }; // just use any valid address

    const defaults = {
      channel,
      allocation: [new BigNumber(5).toHexString(), new BigNumber(4).toHexString()],
      destination: [participantA.address, participantB.address],
    };

    commitment = {
      ...defaults,
      turnNum: 6,
      appCounter: new BigNumber(1).toHexString(),
      commitmentType: CommitmentType.PreFundSetup,
      commitmentCount: 6,
    };
  });

  it('converts a framework Commitment into a counting Commitment', async () => {
    const coreCommitment: Commitment = asCoreCommitment(commitment);
    const countingCommitmentArgs = await testCountingCommitment.fromFrameworkCommitment(ethereumArgs(coreCommitment));
    const { appCounter } = countingCommitmentArgs;
    expect(appCounter).toEqual(new BigNumber(1));
  });
});
