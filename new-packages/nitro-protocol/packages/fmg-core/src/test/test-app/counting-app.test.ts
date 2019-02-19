import expectRevert from '../helpers/expect-revert';
import linker from 'solc/linker';

import { Channel } from '../../';
import { ethers, ContractFactory, utils } from 'ethers';

import CommitmentArtifact from '../../../build/contracts/Commitment.json';

import CountingCommitmentArtifact from '../../../build/contracts/CountingCommitment.json';
import CountingAppArtifact from '../../../build/contracts/CountingApp.json';
import { createCommitment, CountingCommitment, args } from '../../test-app/counting-app';
import { BigNumber } from 'ethers/utils';


const provider = new ethers.providers.JsonRpcProvider('http://localhost:8545');
const signer = provider.getSigner();

describe('CountingApp', () => {
  let app;
  let commitment0: CountingCommitment;
  let commitment1: CountingCommitment;
  let commitmentBalChange;

  beforeAll(async () => {
    // Contract setup --------------------------------------------------------------------------
    const networkId = (await provider.getNetwork()).chainId;
    CountingCommitmentArtifact.bytecode = linker.linkBytecode(CountingCommitmentArtifact.bytecode, {
      Commitment: CommitmentArtifact.networks[networkId].address,
    });

    CountingAppArtifact.bytecode = linker.linkBytecode(CountingAppArtifact.bytecode, {
      CountingCommitment: CountingCommitmentArtifact.networks[networkId].address,
    });
    app = await ContractFactory.fromSolidity(CountingAppArtifact, signer).attach(
      CountingAppArtifact.networks[networkId].address,
    );
    // Contract setup --------------------------------------------------------------------------

    const participantA = new ethers.Wallet(
      '6cbed15c793ce57650b9877cf6fa156fbef513c4e6134f022a85b1ffdd59b2a1',
    );
    const participantB = new ethers.Wallet(
      '6370fd033278c143179d81c5526140625662b8daa446c22ee2d73db3707e620c',
    );
    const participants = [participantA.address, participantB.address];


    const channel: Channel = { channelType: app.address, channelNonce: 0, participants };
    const numberToHexString = (value: number): string => {
      return utils.bigNumberify(value).toHexString();
    };
    const defaults = {
      channel,
      allocation: [numberToHexString(5), numberToHexString(4)],
      destination: [participantA.address, participantB.address],
    };




    commitment0 = createCommitment.app({ ...defaults, turnNum: 6, appCounter: new BigNumber(1), commitmentCount: 1 });
    commitment1 = createCommitment.app({ ...defaults, turnNum: 7, appCounter: new BigNumber(2), commitmentCount: 2 });

    commitmentBalChange = createCommitment.app({
      ...defaults,
      allocation: [numberToHexString(6), numberToHexString(3)],
      turnNum: 7,
      appCounter: new BigNumber(2),
      commitmentCount: 2,
    });
  });

  // Transition fuction tests
  // ========================

  it('allows a move where the count increment', async () => {
    const output = await app.validTransition(args(commitment0), args(commitment1));
    expect(output).toBe(true);
  });

  it("doesn't allow transitions if totals don't match", async () => {
    await expectRevert(app.validTransition(args(commitment0), args(commitmentBalChange)), "CountingApp: allocations must be equal");
  });
});