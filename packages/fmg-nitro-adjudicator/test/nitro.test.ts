import * as ethers from 'ethers';
import NitroArtifact from '../build/contracts/NitroAdjudicator.json';
import { AddressZero } from 'ethers/constants';
import { sign, Channel, CountingApp } from 'fmg-core';
import { BigNumber, bigNumberify } from 'ethers/utils';
import { channelID as getChannelID } from 'fmg-core/lib/channel';
import { expectEvent, expectRevert, Address } from 'magmo-devtools';
import { Commitment as CoreCommitment } from 'fmg-core/src/commitment';

jest.setTimeout(20000);
let nitro: ethers.Contract;
const DEPOSIT_AMOUNT = ethers.utils.parseEther('0.01'); //
const abiCoder = new ethers.utils.AbiCoder();
const AUTH_TYPES = ['address', 'address', 'uint256', 'address'];

async function withdraw(
  participant,
  destination: Address,
  signer = participant,
  amount: ethers.utils.BigNumberish = DEPOSIT_AMOUNT,
  senderAddr = null,
): Promise<any> {
  senderAddr = senderAddr || (await nitro.signer.getAddress());
  const authorization = abiCoder.encode(AUTH_TYPES, [
    participant.address,
    destination,
    amount,
    senderAddr,
  ]);

  const sig = sign(authorization, signer.privateKey);
  return nitro.withdraw(
    participant.address,
    destination,
    amount,
    AddressZero,
    sig.v,
    sig.r,
    sig.s,
    {
      gasLimit: 3000000,
    },
  );
}

describe('Nitro', () => {
  let networkId;
  const provider = new ethers.providers.JsonRpcProvider(
    `http://localhost:${process.env.DEV_GANACHE_PORT}`,
  );
  const signer1 = provider.getSigner(1);
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

  // ETH management
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

    it('Transaction succeeds', async () => {
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
      balanceBefore = await signer1.getBalance();
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
      await expect(await signer1.getBalance()).toEqual(balanceBefore); // TODO handle gas fees
    });
  });

  describe('Depositing ETH (msg.value = amount,  amount < holdings < amount + expectedHeld)', () => {
    let tx1;
    let tx2;
    let receipt;
    let balanceBefore;
    const randomAddress = ethers.Wallet.createRandom().address;

    beforeAll(async () => {
      tx1 = await nitro.deposit(randomAddress, 0, DEPOSIT_AMOUNT.mul(11), AddressZero, {
        value: DEPOSIT_AMOUNT.mul(11),
      });
      await tx1.wait();
      balanceBefore = await signer1.getBalance();
      tx2 = await nitro.deposit(
        randomAddress,
        DEPOSIT_AMOUNT.mul(10),
        DEPOSIT_AMOUNT.mul(2),
        AddressZero,
        {
          value: DEPOSIT_AMOUNT.mul(2),
        },
      );
      receipt = await tx2.wait();
    });
    it('Emits Deposit event (partial) ', async () => {
      await expectEvent(receipt, 'Deposited', {
        destination: randomAddress,
        amountDeposited: DEPOSIT_AMOUNT.mul(1),
      });
    });
    it('Partial refund', async () => {
      await expect(await signer1.getBalance()).toEqual(balanceBefore.sub(DEPOSIT_AMOUNT)); // TODO handle gas fees (recover from receipt?)
    });
  });

  describe('Withdrawing ETH (signer = participant, holdings[participant][0x] = 2 * amount)', () => {
    let tx1;
    let tx2;
    let receipt;
    let beforeBalance;
    let allocatedAtStart;
    const WITHDRAWAL_AMOUNT = DEPOSIT_AMOUNT;

    beforeAll(async () => {
      tx1 = await nitro.deposit(alice.address, 0, DEPOSIT_AMOUNT.mul(2), AddressZero, {
        value: DEPOSIT_AMOUNT.mul(2),
      });
      await tx1.wait();
      allocatedAtStart = await nitro.holdings(alice.address, AddressZero);
      beforeBalance = await provider.getBalance(aliceDest.address);
      tx2 = await withdraw(alice, aliceDest.address, alice, WITHDRAWAL_AMOUNT);
      receipt = await tx2.wait();
    });

    it('Transaction succeeds', async () => {
      await expect(receipt.status).toEqual(1);
    });

    it('Destination balance increases', async () => {
      await expect(await provider.getBalance(aliceDest.address)).toEqual(
        beforeBalance.add(WITHDRAWAL_AMOUNT),
      );
    });

    it('holdings[participant][0x] decreases', async () => {
      await expect(await nitro.holdings(alice.address, AddressZero)).toEqual(
        allocatedAtStart.sub(WITHDRAWAL_AMOUNT),
      );
    });
  });

  describe('Withdrawing ETH (signer =/= partcipant, holdings[participant][0x] = amount)', () => {
    let tx1;
    let tx2;
    let beforeBalance;
    let allocatedAtStart;
    const WITHDRAWAL_AMOUNT = DEPOSIT_AMOUNT;

    beforeAll(async () => {
      tx1 = await nitro.deposit(alice.address, 0, DEPOSIT_AMOUNT.mul(2), AddressZero, {
        value: DEPOSIT_AMOUNT.mul(2),
      });
      await tx1.wait();
      allocatedAtStart = await nitro.holdings(alice.address, AddressZero);
      beforeBalance = await provider.getBalance(aliceDest.address);
      tx2 = withdraw(alice, aliceDest.address, bob, WITHDRAWAL_AMOUNT);
    });

    it('Reverts', async () => {
      await expectRevert(() => tx2, 'Withdraw: not authorized by participant');
    });
  });

  describe('Withdrawing ETH (signer = partcipant, holdings[participant][0x] < amount)', () => {
    let tx2;
    const WITHDRAWAL_AMOUNT = DEPOSIT_AMOUNT;

    beforeAll(async () => {
      tx2 = withdraw(bob, aliceDest.address, bob, WITHDRAWAL_AMOUNT);
    });

    it('Reverts', async () => {
      await expectRevert(() => tx2, 'Withdraw: overdrawn');
    });
  });
});
