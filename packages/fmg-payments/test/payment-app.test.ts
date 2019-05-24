import PaymentAppArtifact from '../build/contracts/PaymentApp.json';
import { ethers } from 'ethers';
import { getNetworkId, getGanacheProvider, expectRevert, delay } from 'magmo-devtools';
import { Commitment, ethereumArgs, CommitmentType } from 'fmg-core';
import * as PaymentApp from '../src/payment-app';

jest.setTimeout(20000);
let paymentApp: ethers.Contract;
const provider = getGanacheProvider();
const asAddress = ethers.Wallet.createRandom().address;
const bsAddress = ethers.Wallet.createRandom().address;
const libraryAddress = ethers.Wallet.createRandom().address;
const defaultCommitmentArgs: PaymentApp.PaymentCommitmentArgs = {
  libraryAddress,
  channelNonce: 5,
  asAddress,
  bsAddress,
  asBalance: '0x5',
  bsBalance: '0x5',
  turnNum: 5,
  commitmentCount: 0,
};

async function setupContracts() {
  const networkId = await getNetworkId();
  const address = PaymentAppArtifact.networks[networkId].address;
  const abi = PaymentAppArtifact.abi;
  paymentApp = await new ethers.Contract(address, abi, provider);
}

describe('PaymentApp', () => {
  describe('Transitions', () => {
    beforeAll(async () => {
      await setupContracts();
    });
    afterEach(async () => {
      await delay(); // ensure that asserted reverts are captured before the jest test exits
    });

    it("allows a transition where the mover's balance decreases", async () => {
      const fromCommitment = PaymentApp.appCommitment(defaultCommitmentArgs);
      const toCommitment = PaymentApp.appCommitment({
        ...defaultCommitmentArgs,
        asBalance: '0x4',
        bsBalance: '0x6',
        turnNum: 6,
      });

      await validTransition(fromCommitment, toCommitment);
    });

    it('allows a transition where the allocations stay the same', async () => {
      const fromCommitment = PaymentApp.appCommitment(defaultCommitmentArgs);

      const toCommitment = PaymentApp.appCommitment({ ...defaultCommitmentArgs, turnNum: 6 });

      await validTransition(fromCommitment, toCommitment);
    });

    it('rejects a transition where player A increases their allocation', async () => {
      const fromCommitment = PaymentApp.appCommitment(defaultCommitmentArgs);

      const toCommitment = PaymentApp.appCommitment({
        ...defaultCommitmentArgs,
        asBalance: '0x6',
        bsBalance: '0x4',
        turnNum: 6,
      });
      await invalidTransition(
        fromCommitment,
        toCommitment,
        'PaymentApp: Player A cannot increase their own allocation.',
      );
    });

    it('rejects a transition where player B increases their allocation', async () => {
      const fromCommitment = PaymentApp.appCommitment({ ...defaultCommitmentArgs, turnNum: 6 });
      const toCommitment = PaymentApp.appCommitment({
        ...defaultCommitmentArgs,
        asBalance: '0x4',
        bsBalance: '0x6',
        turnNum: 7,
      });

      await invalidTransition(
        fromCommitment,
        toCommitment,
        'PaymentApp: Player B cannot increase their own allocation.',
      );
    });
    it('rejects a transition where the total balance is increased', async () => {
      const fromCommitment = PaymentApp.appCommitment(defaultCommitmentArgs);

      const toCommitment = PaymentApp.appCommitment({
        ...defaultCommitmentArgs,
        asBalance: '0x5',
        bsBalance: '0x6',
        turnNum: 6,
      });
      await invalidTransition(
        fromCommitment,
        toCommitment,
        'PaymentApp: The balance must be conserved.',
      );
    });

    it('rejects a transition where the total balance is decreased', async () => {
      const fromCommitment = PaymentApp.appCommitment(defaultCommitmentArgs);

      const toCommitment = PaymentApp.appCommitment({
        ...defaultCommitmentArgs,
        asBalance: '0x4',
        bsBalance: '0x5',
        turnNum: 6,
      });
      await invalidTransition(
        fromCommitment,
        toCommitment,
        'PaymentApp: The balance must be conserved.',
      );
    });
  });
  describe('Transition Helpers', () => {
    describe('initialPreFundSetup', () => {
      it('creates a correct pre-fund setup commitment', () => {
        const commitment = PaymentApp.initialPreFundSetup(
          defaultCommitmentArgs.libraryAddress,
          defaultCommitmentArgs.channelNonce,
          defaultCommitmentArgs.asAddress,
          defaultCommitmentArgs.bsAddress,
          defaultCommitmentArgs.asBalance,
          defaultCommitmentArgs.bsBalance,
        );
        expect(commitment).toMatchObject({
          allocation: [defaultCommitmentArgs.asBalance, defaultCommitmentArgs.bsBalance],
          destination: [asAddress, bsAddress],
          commitmentType: CommitmentType.PreFundSetup,
          commitmentCount: 0,
          turnNum: 0,
        });
      });
    });
    describe('pass', () => {
      it('transitions correctly', () => {
        const previousCommitment = PaymentApp.postFundSetupCommitment({
          ...defaultCommitmentArgs,
          turnNum: 3,
          commitmentCount: 1,
        });
        const commitment = PaymentApp.pass(previousCommitment);
        expect(commitment).toMatchObject({
          commitmentType: CommitmentType.App,
          commitmentCount: 0,
          turnNum: 4,
        });
      });
    });
    describe('pay', () => {
      it("transitions correctly on Player A's turn", () => {
        const previousCommitment = PaymentApp.postFundSetupCommitment({
          ...defaultCommitmentArgs,
          turnNum: 5,
          commitmentCount: 1,
        });
        const commitment = PaymentApp.pay(previousCommitment, '0x1', PaymentApp.PlayerIndex.A);
        expect(commitment).toMatchObject({
          commitmentType: CommitmentType.App,
          commitmentCount: 0,
          turnNum: 6,
          allocation: ['0x04', '0x06'],
        });
      });
      it("creates a replace commitment when it is player A's turn and they pay", () => {
        const previousCommitment = PaymentApp.appCommitment({
          ...defaultCommitmentArgs,
          turnNum: 4,
        });
        const commitment = PaymentApp.pay(previousCommitment, '0x1', PaymentApp.PlayerIndex.A);
        expect(commitment).toMatchObject({
          commitmentType: CommitmentType.App,
          commitmentCount: 0,
          turnNum: 4,
          allocation: ['0x04', '0x06'],
        });
      });
      it("transitions correctly on Player B's turn", () => {
        const previousCommitment = PaymentApp.postFundSetupCommitment({
          ...defaultCommitmentArgs,
          turnNum: 4,
          commitmentCount: 1,
        });
        const commitment = PaymentApp.pay(previousCommitment, '0x1', PaymentApp.PlayerIndex.B);
        expect(commitment).toMatchObject({
          commitmentType: CommitmentType.App,
          commitmentCount: 0,
          turnNum: 5,
          allocation: ['0x06', '0x04'],
        });
      });
      it("creates a replace commitment when it is player B's turn and they pay", () => {
        const previousCommitment = PaymentApp.appCommitment({
          ...defaultCommitmentArgs,
          turnNum: 5,
        });
        const commitment = PaymentApp.pay(previousCommitment, '0x1', PaymentApp.PlayerIndex.B);
        expect(commitment).toMatchObject({
          commitmentType: CommitmentType.App,
          commitmentCount: 0,
          turnNum: 5,
          allocation: ['0x06', '0x04'],
        });
      });
    });
    describe('postFundSetup', () => {
      it('transitions from a pre fund setup to a post fund setup', () => {
        const previousCommitment = PaymentApp.preFundSetupCommitment({
          ...defaultCommitmentArgs,
          turnNum: 1,
          commitmentCount: 1,
        });
        const commitment = PaymentApp.postFundSetup(previousCommitment);
        expect(commitment).toMatchObject({
          commitmentType: CommitmentType.PostFundSetup,
          commitmentCount: 0,
          turnNum: 2,
        });
      });
    });
    describe('conclude', () => {
      it('transitions from an app commitment to conclude', () => {
        const previousCommitment = PaymentApp.appCommitment({
          ...defaultCommitmentArgs,
          turnNum: 5,
          commitmentCount: 0,
        });
        const commitment = PaymentApp.conclude(previousCommitment);
        expect(commitment).toMatchObject({
          commitmentType: CommitmentType.Conclude,
          commitmentCount: 0,
          turnNum: 6,
        });
      });
    });
  });
});

async function validTransition(fromCommitment: Commitment, toCommitment: Commitment) {
  expect(
    await paymentApp.validTransition(ethereumArgs(fromCommitment), ethereumArgs(toCommitment)),
  ).toBe(true);
}

async function invalidTransition(fromCommitment: Commitment, toCommitment: Commitment, reason?) {
  expect.assertions(1);
  await expectRevert(
    () => paymentApp.validTransition(ethereumArgs(fromCommitment), ethereumArgs(toCommitment)),
    reason,
  );
}
