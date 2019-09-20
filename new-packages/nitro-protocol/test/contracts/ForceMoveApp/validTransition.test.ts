import TrivialAppArtifact from '../../../build/contracts/TrivialApp.json';
import {Channel} from '../../../src/contract/channel';
import {ethers, Contract} from 'ethers';
import {State} from '../../../src/contract/state';
import {setupContracts} from '../../test-helpers';
import {validTransition} from '../../../src/contract/force-move-app';

const provider = new ethers.providers.JsonRpcProvider(
  `http://localhost:${process.env.DEV_GANACHE_PORT}`,
);
let forceMoveApp: Contract;

beforeAll(async () => {
  forceMoveApp = await setupContracts(provider, TrivialAppArtifact);
});

describe('ForceMoveApp', () => {
  const channel: Channel = {
    participants: [ethers.Wallet.createRandom().address, ethers.Wallet.createRandom().address],
    chainId: '0x1',
    channelNonce: '0x1',
  };
  describe('validTransition', () => {
    it('returns true for a trivial valid transition', async () => {
      const fromState: State = {
        channel,
        outcome: [],
        turnNum: 1,
        isFinal: false,
        challengeDuration: 0x0,
        appDefinition: forceMoveApp.address,
        appData: '0x0',
      };
      const toState: State = {...fromState, turnNum: 2};

      expect(
        await validTransition(fromState, toState, forceMoveApp.address, provider.getSigner(0)),
      ).toBe(true);
    });
  });
});
