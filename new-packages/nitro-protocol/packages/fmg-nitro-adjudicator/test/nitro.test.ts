import * as ethers from 'ethers';
import NitroArtifact from '../build/contracts/NitroAdjudicator.json';
import ERC20Artifact from '../build/contracts/testERC20.json';
import { AddressZero } from 'ethers/constants';
import { sign, Channel, CountingApp, Address } from 'fmg-core';
import { BigNumber, bigNumberify } from 'ethers/utils';
import { channelID as getChannelID } from 'fmg-core/lib/channel';
import { expectEvent, expectRevert } from 'magmo-devtools';
import { Commitment as CoreCommitment } from 'fmg-core/src/commitment';

jest.setTimeout(20000);
let nitro: ethers.Contract;
const DEPOSIT_AMOUNT = ethers.utils.parseEther('0.01'); //
const ERC20_DEPOSIT_AMOUNT = 5; //
const abiCoder = new ethers.utils.AbiCoder();
const AUTH_TYPES = ['address', 'address', 'uint256', 'address'];

async function withdraw(
  participant,
  destination: Address,
  signer = participant,
  amount: ethers.utils.BigNumberish = DEPOSIT_AMOUNT,
  senderAddr = null,
  token = AddressZero,
): Promise<any> {
  senderAddr = senderAddr || (await nitro.signer.getAddress());
  const authorization = abiCoder.encode(AUTH_TYPES, [
    participant.address,
    destination,
    amount,
    senderAddr,
  ]);

  const sig = sign(authorization, signer.privateKey);
  return nitro.withdraw(participant.address, destination, amount, token, sig.v, sig.r, sig.s, {
    gasLimit: 3000000,
  });
}

const provider = new ethers.providers.JsonRpcProvider(
  `http://localhost:${process.env.DEV_GANACHE_PORT}`,
);
const signer0 = provider.getSigner(0);

const alice = new ethers.Wallet(
  '0x5d862464fe9303452126c8bc94274b8c5f9874cbd219789b3eb2128075a76f72',
);
const bob = new ethers.Wallet('0xdf02719c4df8b9b8ac7f551fcb5d9ef48fa27eef7a66453879f4d8fdc6e78fb1');
const guarantor = ethers.Wallet.createRandom();
const aliceDest = ethers.Wallet.createRandom();
const aBal = ethers.utils.parseUnits('6', 'wei').toHexString();
const bBal = ethers.utils.parseUnits('4', 'wei').toHexString();
const allocation = [aBal, bBal];
const differentAllocation = [bBal, aBal];
let ledgerChannel: Channel;
describe('Nitro (ETH deposit and withdrawal)', () => {
  let networkId;

  //   let guarantor: ethers.Wallet;
  //   let commitment0;
  //   let commitment1;
  //   let commitment2;
  //   let commitment3;
  //   let commitment4;
  //   let commitment4alt: CoreCommitment;
  //   let commitment5;
  //   let commitment5alt: CoreCommitment;
  //   let guarantorCommitment;

  //   let commitment1alt;
  //   let commitment2alt;
  //   let conclusionProof;

  // ETH management
  // ========================

  beforeAll(async () => {
    networkId = (await provider.getNetwork()).chainId;
    const libraryAddress = NitroArtifact.networks[networkId].address;
    nitro = new ethers.Contract(libraryAddress, NitroArtifact.abi, signer0);

    // alice and bob are both funded by startGanache in magmo devtools.

    // const destination = [alice.address, bob.address];
    const participants = [alice.address, bob.address];
    ledgerChannel = {
      channelType: '0xd115bffabbdd893a6f7cea402e7338643ced44a6',
      nonce: 0,
      participants,
    };

    // guarantorChannel = {
    //   ...ledgerChannel,
    //   guaranteedChannel: getChannelID(ledgerChannel),
    // };

    // const defaults = {
    //   channel: ledgerChannel,
    //   appCounter: new BigNumber(0).toHexString(),
    //   destination,
    //   allocation,
    //   token: [AddressZero, AddressZero],
    //   commitmentCount: 1,
    // };

    // const guarantorDefaults = {
    //   ...defaults,
    //   channel: guarantorChannel,
    // };

    // commitment0 = CountingApp.createCommitment.app({
    //   ...defaults,
    //   appCounter: new BigNumber(1).toHexString(),
    //   turnNum: 6,
    // });
    // commitment1 = CountingApp.createCommitment.app({
    //   ...defaults,
    //   turnNum: 7,
    //   appCounter: new BigNumber(2).toHexString(),
    // });
    // commitment2 = CountingApp.createCommitment.app({
    //   ...defaults,
    //   turnNum: 8,
    //   appCounter: new BigNumber(3).toHexString(),
    // });
    // commitment3 = CountingApp.createCommitment.app({
    //   ...defaults,
    //   turnNum: 9,
    //   appCounter: new BigNumber(4).toHexString(),
    // });
    // commitment4 = CountingApp.createCommitment.conclude({
    //   ...defaults,
    //   turnNum: 10,
    //   appCounter: new BigNumber(5).toHexString(),
    // });
    // commitment5 = CountingApp.createCommitment.conclude({
    //   ...defaults,
    //   turnNum: 11,
    //   appCounter: new BigNumber(6).toHexString(),
    // });
    // commitment1alt = CountingApp.createCommitment.app({
    //   ...defaults,
    //   channel: ledgerChannel,
    //   allocation: differentAllocation,
    //   turnNum: 7,
    //   appCounter: new BigNumber(2).toHexString(),
    // });
    // commitment2alt = CountingApp.createCommitment.app({
    //   ...defaults,
    //   channel: ledgerChannel,
    //   allocation: differentAllocation,
    //   turnNum: 8,
    //   appCounter: new BigNumber(3).toHexString(),
    // });
    // guarantorCommitment = CountingApp.createCommitment.app({
    //   ...guarantorDefaults,
    //   appCounter: new BigNumber(1).toHexString(),
    //   turnNum: 6,
    // });
  });

  describe('Depositing ETH (msg.value = amount , expectedHeld = 0)', () => {
    let tx;
    // let tx2;
    let receipt;
    // let receipt2;
    const randomAddress = ethers.Wallet.createRandom().address;

    it('Transaction succeeds', async () => {
      tx = await nitro.deposit(randomAddress, 0, DEPOSIT_AMOUNT, AddressZero, {
        value: DEPOSIT_AMOUNT,
      });
      receipt = await tx.wait();
      // tx2 = await nitro.deposit(randomAddress, 0, DEPOSIT_AMOUNT, AddressZero, {
      //   value: DEPOSIT_AMOUNT,
      // });
      // receipt2 = await tx2.wait();
      await expect(receipt.status).toEqual(1);
      // await expect(receipt2.status).toEqual(1);
    });

    it('Updates holdings', async () => {
      const allocatedAmount = await nitro.holdings(randomAddress, AddressZero);
      await expect(allocatedAmount).toEqual(DEPOSIT_AMOUNT);
    });

    it('Fires a deposited event', async () => {
      await expectEvent(receipt, 'Deposited', {
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
      balanceBefore = await signer0.getBalance();
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
      await expect(await signer0.getBalance()).toEqual(balanceBefore); // TODO handle gas fees
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
      balanceBefore = await signer0.getBalance();
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
      await expect(Number(await signer0.getBalance())).toBeGreaterThan(
        Number(balanceBefore.sub(DEPOSIT_AMOUNT.mul(2))),
      ); // TODO compute precisely, taking actual gas fees into account
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

  describe('Withdrawing ETH (signer = partcipant, holdings[participant][0x] > amount)', () => {
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

// ERC20 management
// ========================
let erc20;
let erc20Address;
let nitroAddress;
describe('Nitro (ERC20 deposit and withdrawal)', () => {
  //   const provider = new ethers.providers.JsonRpcProvider(
  //     `http://localhost:${process.env.DEV_GANACHE_PORT}`,
  //   );
  //   const signer0 = provider.getSigner(1);
  beforeAll(async () => {
    const networkId = (await provider.getNetwork()).chainId;
    erc20Address = ERC20Artifact.networks[networkId].address;
    erc20 = new ethers.Contract(erc20Address, ERC20Artifact.abi, signer0);
    nitroAddress = NitroArtifact.networks[networkId].address;
  });

  describe('Depositing ERC20 (expectedHeld = 0)', () => {
    let tx1;
    let tx2;
    let balance;
    let receipt1;
    let receipt2;
    let winner;
    const randomAddress = ethers.Wallet.createRandom().address;

    beforeAll(async () => {
      winner = await signer0.getAddress();
    });

    it('msg.sender has enough ERC20 tokens', async () => {
      balance = Number(await erc20.balanceOf(winner));
      await expect(balance).toBeGreaterThanOrEqual(ERC20_DEPOSIT_AMOUNT);
    });

    it('ERC20 approve transaction succeeds', async () => {
      tx1 = await erc20.approve(nitroAddress, ERC20_DEPOSIT_AMOUNT);
      receipt1 = await tx1.wait();
      await expect(receipt1.status).toEqual(1);
    });

    it('ERC20 emits an approval event', async () => {
      // TODO: magmo-devtools.expectEvent does not work here
      const filter = {
        address: erc20Address,
        fromBlock: receipt1.blockNumber,
        toBlock: receipt1.blockNumber,
        topics: [erc20.interface.events.Approval.topic],
      };
      const logs = await provider.getLogs(filter);
      await expect(Number(logs[0].data)).toEqual(ERC20_DEPOSIT_AMOUNT);
    });

    it('ERC20 allowance for nitro updated', async () => {
      const allowance = Number(await erc20.allowance(winner, nitroAddress));
      await expect(allowance).toEqual(ERC20_DEPOSIT_AMOUNT);
    });

    it('Nitro deposit Transaction succeeds', async () => {
      tx2 = await nitro.deposit(randomAddress, 0, ERC20_DEPOSIT_AMOUNT, erc20Address);
      receipt2 = await tx2.wait();
      await expect(receipt2.status).toEqual(1);
    });

    it('Updates holdings', async () => {
      const allocatedAmount = await nitro.holdings(randomAddress, erc20Address);
      await expect(Number(allocatedAmount)).toEqual(ERC20_DEPOSIT_AMOUNT);
    });

    it('Fires a deposited event', async () => {
      await expectEvent(receipt2, 'Deposited', {
        destination: randomAddress,
        amountDeposited: bigNumberify(ERC20_DEPOSIT_AMOUNT),
      });
    });
  });

  describe('Depositing ERC20 (expectedHeld > holdings)', () => {
    let tx2;
    let winner;
    const randomAddress = ethers.Wallet.createRandom().address;

    beforeAll(async () => {
      winner = await signer0.getAddress();
      await erc20.approve(nitroAddress, ERC20_DEPOSIT_AMOUNT);
    });

    it('Nitro deposit transaction reverts', async () => {
      tx2 = nitro.deposit(randomAddress, 10, ERC20_DEPOSIT_AMOUNT, erc20Address);
      await expectRevert(() => tx2, 'Deposit: holdings[destination][token] is less than expected');
    });
  });

  describe('Depositing ERC20 (expectedHeld + amount < holdings)', () => {
    let tx1;
    let tx2;
    let receipt;
    let balanceBefore;
    let winner;
    const randomAddress = ethers.Wallet.createRandom().address;

    beforeAll(async () => {
      winner = await signer0.getAddress();
      await erc20.approve(nitroAddress, 4);
      const amountHeld = Number(await nitro.holdings(randomAddress, erc20Address));
      tx1 = await nitro.deposit(randomAddress, amountHeld, 3, erc20Address);
      await tx1.wait();

      balanceBefore = await erc20.balanceOf(winner);
    });

    it('Nitro holds ERC20s for destination', async () => {
      const holdings = Number(await nitro.holdings(randomAddress, erc20Address));
      await expect(holdings).toBeGreaterThanOrEqual(3);
    });

    it('Nitro has sufficient ERC20 allowance for another deposit', async () => {
      const allowance = Number(await erc20.allowance(winner, nitroAddress));
      await expect(allowance).toBeGreaterThanOrEqual(1);
    });

    it('msg.sender has sufficient ERC20 balance for another deposit', async () => {
      const balance = Number(await erc20.balanceOf(winner));
      await expect(balance).toBeGreaterThanOrEqual(1);
    });

    it('Nitro deposit Transaction succeeds', async () => {
      const amountHeld = Number(await nitro.holdings(randomAddress, erc20Address));
      tx2 = await nitro.deposit(randomAddress, amountHeld - 2, 1, erc20Address); // TODO deposit more than 0 (not sure why it is reverting in that case)
      receipt = await tx2.wait();
      await expect(receipt.status).toEqual(1);
    });
    it('Emits Deposit of 0 event ', async () => {
      await expectEvent(receipt, 'Deposited', {
        destination: randomAddress,
        amountDeposited: bigNumberify(0),
      });
    });
    it('ERC20 Balance unchanged', async () => {
      await expect(await erc20.balanceOf(winner)).toEqual(balanceBefore);
    });
  });

  describe('Depositing ERC20 (amount < holdings < amount + expectedHeld)', () => {
    let tx1;
    let tx2;
    let receipt;
    let balanceBefore;
    let winner;
    const randomAddress = ethers.Wallet.createRandom().address;

    beforeAll(async () => {
      winner = await signer0.getAddress();
      await erc20.approve(nitroAddress, 3);
      const amountHeld = Number(await nitro.holdings(randomAddress, erc20Address));
      tx1 = await nitro.deposit(randomAddress, amountHeld, 3, erc20Address);
      // holdings now >= 3
      await tx1.wait();
      balanceBefore = Number(await erc20.balanceOf(winner));
    });

    it('Nitro deposit Transaction succeeds', async () => {
      const amountHeld = Number(await nitro.holdings(randomAddress, erc20Address));
      await erc20.approve(nitroAddress, amountHeld - 1);
      tx2 = await nitro.deposit(randomAddress, 2, amountHeld - 1, erc20Address);
      receipt = await tx2.wait();
      await expect(receipt.status).toEqual(1);
    });
    it.skip('Emits Deposit event (partial) ', async () => {
      // several events being emitted?
      console.log(receipt);
      await expectEvent(receipt, 'Deposited', {
        destination: randomAddress,
        amountDeposited: 1,
      });
    });
    it('Partial refund', async () => {
      await expect(Number(await erc20.balanceOf(winner))).toEqual(Number(balanceBefore - 1));
    });
  });

  describe('Withdrawing ERC20 (signer = participant, holdings[participant][erc20] >  amount)', () => {
    let tx1;
    let tx2;
    let receipt;
    let beforeBalance;
    let allocatedAtStart;
    const ERC20_WITHDRAWAL_AMOUNT = ERC20_DEPOSIT_AMOUNT;

    it('Nitro holds ERC20s for participant', async () => {
      const tx0 = await erc20.approve(nitroAddress, ERC20_WITHDRAWAL_AMOUNT);
      await tx0.wait();
      const amountHeld = Number(await nitro.holdings(alice.address, erc20Address));
      tx1 = await nitro.deposit(alice.address, amountHeld, ERC20_WITHDRAWAL_AMOUNT, erc20Address);
      await tx1.wait();
      allocatedAtStart = Number(await nitro.holdings(alice.address, erc20Address));
      beforeBalance = Number(await erc20.balanceOf(aliceDest.address));
      await expect(allocatedAtStart).toBeGreaterThanOrEqual(ERC20_WITHDRAWAL_AMOUNT);
    });

    it('Transaction succeeds', async () => {
      tx2 = await withdraw(
        alice,
        aliceDest.address,
        alice,
        ERC20_WITHDRAWAL_AMOUNT,
        null,
        erc20Address,
      );
      receipt = await tx2.wait();
      await expect(receipt.status).toEqual(1);
    });

    it('Destination balance increases', async () => {
      await expect(Number(await erc20.balanceOf(aliceDest.address))).toEqual(
        beforeBalance + ERC20_WITHDRAWAL_AMOUNT,
      );
    });

    it('holdings[participant][0x] decreases', async () => {
      await expect(Number(await nitro.holdings(alice.address, erc20Address))).toEqual(
        allocatedAtStart - ERC20_WITHDRAWAL_AMOUNT,
      );
    });
  });

  describe('Withdrawing ERC20 (signer =/= partcipant, holdings[participant][erc20] > amount)', () => {
    let tx1;
    let tx2;
    let beforeBalance;
    let allocatedAtStart;
    const ERC20_WITHDRAWAL_AMOUNT = ERC20_DEPOSIT_AMOUNT;

    it('Nitro holds ERC20s for participant', async () => {
      const tx0 = await erc20.approve(nitroAddress, ERC20_WITHDRAWAL_AMOUNT);
      await tx0.wait();
      const amountHeld = Number(await nitro.holdings(alice.address, erc20Address));
      tx1 = await nitro.deposit(alice.address, amountHeld, ERC20_WITHDRAWAL_AMOUNT, erc20Address);
      await tx1.wait();
      allocatedAtStart = Number(await nitro.holdings(alice.address, erc20Address));
      beforeBalance = Number(await erc20.balanceOf(aliceDest.address));
      await expect(allocatedAtStart).toBeGreaterThanOrEqual(ERC20_WITHDRAWAL_AMOUNT);
    });

    it('Reverts', async () => {
      tx2 = withdraw(alice, aliceDest.address, bob, ERC20_WITHDRAWAL_AMOUNT, null, erc20Address);
      await expectRevert(() => tx2, 'Withdraw: not authorized by participant');
    });
  });

  describe('Withdrawing ETH (signer = partcipant, holdings[participant][0x] < amount)', () => {
    let tx1;
    let tx2;
    let beforeBalance;
    let allocatedAtStart;
    const ERC20_WITHDRAWAL_AMOUNT = ERC20_DEPOSIT_AMOUNT;

    it('Nitro holds insufficient ERC20s for participant', async () => {
      const tx0 = await erc20.approve(nitroAddress, ERC20_WITHDRAWAL_AMOUNT);
      await tx0.wait();
      const amountHeld = Number(await nitro.holdings(alice.address, erc20Address));
      tx1 = await nitro.deposit(alice.address, amountHeld, ERC20_WITHDRAWAL_AMOUNT, erc20Address);
      await tx1.wait();
      allocatedAtStart = Number(await nitro.holdings(alice.address, erc20Address));
      await expect(allocatedAtStart).toBeGreaterThanOrEqual(ERC20_WITHDRAWAL_AMOUNT);
    });

    it('Reverts', async () => {
      tx2 = withdraw(alice, aliceDest.address, alice, allocatedAtStart + 1, null, erc20Address);
      await expectRevert(() => tx2, 'Withdraw: overdrawn');
    });
  });
});
