import * as ethers from 'ethers';
import NitroArtifact from '../build/contracts/NitroAdjudicator.json';
import { AddressZero } from 'ethers/constants';
import { Channel, CountingApp } from 'fmg-core';
import { BigNumber, bigNumberify } from 'ethers/utils';
import { channelID as getChannelID } from 'fmg-core/lib/channel';
import { expectEvent, expectRevert } from 'magmo-devtools';
import { Commitment as CoreCommitment } from 'fmg-core/src/commitment';

jest.setTimeout(20000);

const DEPOSIT_AMOUNT = ethers.utils.parseEther('1'); //

describe('Nitro', () => {
  let networkId;
  const provider = new ethers.providers.JsonRpcProvider(
    `http://localhost:${process.env.DEV_GANACHE_PORT}`,
  );
  const signer1 = provider.getSigner(1);
  let nitro;
  const aBal = ethers.utils.parseUnits('6', 'wei').toHexString();
  const bBal = ethers.utils.parseUnits('4', 'wei').toHexString();
  const allocation = [aBal, bBal];
  const differentAllocation = [bBal, aBal];
  let ledgerChannel: Channel;
  let guarantorChannel: Channel;
  let alice: ethers.Wallet;
  let aliceDest: ethers.Wallet;
  let bob: ethers.Wallet;
  let guarantor: ethers.Wallet;
  let commitment0;
  let commitment1;
  let commitment2;
  let commitment3;
  let commitment4;
  let commitment4alt: CoreCommitment;
  let commitment5;
  let commitment5alt: CoreCommitment;
  let guarantorCommitment;

  let commitment1alt;
  let commitment2alt;
  let conclusionProof;

  beforeAll(async () => {
    networkId = (await provider.getNetwork()).chainId;
    const libraryAddress = NitroArtifact.networks[networkId].address;
    nitro = new ethers.Contract(libraryAddress, NitroArtifact.abi, signer1);

    // alice and bob are both funded by startGanache in magmo devtools.
    alice = new ethers.Wallet('0x5d862464fe9303452126c8bc94274b8c5f9874cbd219789b3eb2128075a76f72');
    bob = new ethers.Wallet('0xdf02719c4df8b9b8ac7f551fcb5d9ef48fa27eef7a66453879f4d8fdc6e78fb1');
    guarantor = ethers.Wallet.createRandom();
    aliceDest = ethers.Wallet.createRandom();

    const participants = [alice.address, bob.address];
    const destination = [alice.address, bob.address];

    ledgerChannel = {
      channelType: '0xd115bffabbdd893a6f7cea402e7338643ced44a6',
      nonce: 0,
      participants,
    };

    guarantorChannel = {
      ...ledgerChannel,
      guaranteedChannel: getChannelID(ledgerChannel),
    };

    const defaults = {
      channel: ledgerChannel,
      appCounter: new BigNumber(0).toHexString(),
      destination,
      allocation,
      token: [AddressZero, AddressZero],
      commitmentCount: 1,
    };

    const guarantorDefaults = {
      ...defaults,
      channel: guarantorChannel,
    };

    commitment0 = CountingApp.createCommitment.app({
      ...defaults,
      appCounter: new BigNumber(1).toHexString(),
      turnNum: 6,
    });
    commitment1 = CountingApp.createCommitment.app({
      ...defaults,
      turnNum: 7,
      appCounter: new BigNumber(2).toHexString(),
    });
    commitment2 = CountingApp.createCommitment.app({
      ...defaults,
      turnNum: 8,
      appCounter: new BigNumber(3).toHexString(),
    });
    commitment3 = CountingApp.createCommitment.app({
      ...defaults,
      turnNum: 9,
      appCounter: new BigNumber(4).toHexString(),
    });
    commitment4 = CountingApp.createCommitment.conclude({
      ...defaults,
      turnNum: 10,
      appCounter: new BigNumber(5).toHexString(),
    });
    commitment5 = CountingApp.createCommitment.conclude({
      ...defaults,
      turnNum: 11,
      appCounter: new BigNumber(6).toHexString(),
    });
    commitment1alt = CountingApp.createCommitment.app({
      ...defaults,
      channel: ledgerChannel,
      allocation: differentAllocation,
      turnNum: 7,
      appCounter: new BigNumber(2).toHexString(),
    });
    commitment2alt = CountingApp.createCommitment.app({
      ...defaults,
      channel: ledgerChannel,
      allocation: differentAllocation,
      turnNum: 8,
      appCounter: new BigNumber(3).toHexString(),
    });
    guarantorCommitment = CountingApp.createCommitment.app({
      ...guarantorDefaults,
      appCounter: new BigNumber(1).toHexString(),
      turnNum: 6,
    });
  });

  // Function tests
  // ========================

  describe('Depositing ETH (msg.value = amount , expectedHeld = 0)', () => {
    let tx;
    let receipt;
    const randomAddress = ethers.Wallet.createRandom().address;

    beforeAll(async () => {
      tx = await nitro.deposit(randomAddress, 0, DEPOSIT_AMOUNT, AddressZero, {
        value: DEPOSIT_AMOUNT,
      });
      receipt = await tx.wait();
    });

    it('Accepts transaction', async () => {
      expect(receipt.status).toEqual(1);
    });

    it('Updates holdings', async () => {
      const allocatedAmount = await nitro.holdings(randomAddress, AddressZero);
      expect(allocatedAmount).toEqual(DEPOSIT_AMOUNT);
    });

    it('Fires a deposited event', async () => {
      expectEvent(receipt, 'Deposited', {
        destination: randomAddress,
        amountDeposited: bigNumberify(DEPOSIT_AMOUNT),
      });
    });
  });

  describe('Depositing ETH (msg.value = amount, expectedHeld > holdings)', () => {
    let tx;
    const randomAddress = ethers.Wallet.createRandom().address;

    it('Reverts', async () => {
      tx = nitro.deposit(randomAddress, 10, DEPOSIT_AMOUNT, AddressZero, {
        value: DEPOSIT_AMOUNT,
      });
      await expectRevert(() => tx, 'Deposit: holdings[destination][token] is less than expected');
    });
  });

  describe('Depositing ETH (msg.value = amount, expectedHeld + amount < holdings)', () => {
    let tx1;
    let tx2;
    let receipt;
    let balanceBefore;
    const randomAddress = ethers.Wallet.createRandom().address;

    beforeAll(async () => {
      tx1 = await nitro.deposit(randomAddress, 0, DEPOSIT_AMOUNT.mul(2), AddressZero, {
        value: DEPOSIT_AMOUNT.mul(2),
      });
      await tx1.wait();
      balanceBefore = signer1.getBalance();
      tx2 = await nitro.deposit(randomAddress, 0, DEPOSIT_AMOUNT, AddressZero, {
        value: DEPOSIT_AMOUNT,
      });
      receipt = await tx2.wait();
    });
    it('Emits Deposit of 0 event ', async () => {
      await expectEvent(receipt, 'Deposited', {
        destination: randomAddress,
        amountDeposited: bigNumberify(0),
      });
    });
    it('Refunds entire deposit', async () => {
      expect(signer1.getBalance()).toEqual(balanceBefore);
    });
  });
});
