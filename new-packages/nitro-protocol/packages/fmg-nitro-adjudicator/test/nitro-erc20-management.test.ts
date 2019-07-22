import * as ethers from 'ethers';
import NitroAdjudicatorArtifact from '../build/contracts/TestNitroAdjudicator.json';
import ERC20Artifact from '../build/contracts/testERC20.json';
import { AddressZero } from 'ethers/constants';
import { sign, Channel, CountingApp, Address, asEthersObject } from 'fmg-core';
import { BigNumber, bigNumberify } from 'ethers/utils';
import { channelID as getChannelID } from 'fmg-core/lib/channel';
import { expectEvent, expectRevert } from 'magmo-devtools';
import { asCoreCommitment } from 'fmg-core/lib/test-app/counting-app';
import { CountingCommitment } from 'fmg-core/src/test-app/counting-app';
import { fromParameters } from 'fmg-core/lib/commitment';

jest.setTimeout(20000);
let NitroAdjudicator: ethers.Contract;
const ERC20_DEPOSIT_AMOUNT = 5; //
const abiCoder = new ethers.utils.AbiCoder();
const AUTH_TYPES = ['address', 'address', 'uint256', 'address'];

async function withdraw(
  participant,
  destination: Address,
  signer = participant,
  amount: ethers.utils.BigNumberish = ERC20_DEPOSIT_AMOUNT,
  senderAddr = null,
  token = AddressZero,
): Promise<any> {
  senderAddr = senderAddr || (await NitroAdjudicator.signer.getAddress());
  const authorization = abiCoder.encode(AUTH_TYPES, [
    participant.address,
    destination,
    amount,
    senderAddr,
  ]);

  const sig = sign(authorization, signer.privateKey);
  return NitroAdjudicator.withdraw(
    participant.address,
    destination,
    amount,
    token,
    sig.v,
    sig.r,
    sig.s,
    {
      gasLimit: 3000000,
    },
  );
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
const aBal = '0x06';
const bBal = '0x04';
const allocation = [aBal, bBal];
const participants = [alice.address, bob.address];
const destination = [alice.address, bob.address];

const ledgerChannel: Channel = {
  channelType: '0xD115BFFAbbdd893A6f7ceA402e7338643Ced44a6',
  nonce: 0,
  participants,
};
const guarantorChannel = {
  ...ledgerChannel,
  guaranteedChannel: getChannelID(ledgerChannel),
};
const getEthersObjectForCommitment = (commitment: CountingCommitment) => {
  return asEthersObject(asCoreCommitment(commitment));
};
const getOutcomeFromParameters = (parameters: any[]) => {
  const outcome = {
    destination: parameters[0],
    finalizedAt: ethers.utils.bigNumberify(parameters[1]),
    challengeCommitment: asEthersObject(fromParameters(parameters[2])),
    allocation: parameters[3].map(a => a.toHexString()),
  };
  return outcome;
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

const commitment0 = CountingApp.createCommitment.app({
  ...defaults,
  appCounter: new BigNumber(1).toHexString(),
  turnNum: 6,
});

const guarantorCommitment = CountingApp.createCommitment.app({
  ...guarantorDefaults,
  appCounter: new BigNumber(1).toHexString(),
  turnNum: 6,
});

// ERC20 management
// ========================
let erc20;
let erc20Address;
let NitroAdjudicatorAddress;
describe('Nitro (ERC20 management)', () => {
  beforeAll(async () => {
    const networkId = (await provider.getNetwork()).chainId;
    NitroAdjudicatorAddress = NitroAdjudicatorArtifact.networks[networkId].address;
    NitroAdjudicator = new ethers.Contract(
      NitroAdjudicatorAddress,
      NitroAdjudicatorArtifact.abi,
      signer0,
    );
    erc20Address = ERC20Artifact.networks[networkId].address;
    erc20 = new ethers.Contract(erc20Address, ERC20Artifact.abi, signer0);
  });

  describe('Depositing ERC20 (expectedHeld = 0)', () => {
    let receipt1;
    let receipt2;
    let erc20Holder;
    const randomAddress = ethers.Wallet.createRandom().address;

    beforeAll(async () => {
      erc20Holder = await signer0.getAddress();
    });

    it('msg.sender has enough ERC20 tokens', async () => {
      const balance = Number(await erc20.balanceOf(erc20Holder));
      await expect(balance).toBeGreaterThanOrEqual(ERC20_DEPOSIT_AMOUNT);
    });

    it('ERC20 approve transaction succeeds', async () => {
      receipt1 = await (await erc20.approve(NitroAdjudicatorAddress, ERC20_DEPOSIT_AMOUNT)).wait();
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
      const allowance = Number(await erc20.allowance(erc20Holder, NitroAdjudicatorAddress));
      await expect(allowance).toEqual(ERC20_DEPOSIT_AMOUNT);
    });

    it('Nitro deposit Transaction succeeds', async () => {
      receipt2 = await (await NitroAdjudicator.deposit(
        randomAddress,
        0,
        ERC20_DEPOSIT_AMOUNT,
        erc20Address,
      )).wait();
      await expect(receipt2.status).toEqual(1);
    });

    it('Updates holdings', async () => {
      const allocatedAmount = await NitroAdjudicator.holdings(randomAddress, erc20Address);
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
    const randomAddress = ethers.Wallet.createRandom().address;

    beforeAll(async () => {
      await erc20.approve(NitroAdjudicatorAddress, ERC20_DEPOSIT_AMOUNT);
    });

    it('Nitro deposit transaction reverts', async () => {
      const tx2 = NitroAdjudicator.deposit(randomAddress, 10, ERC20_DEPOSIT_AMOUNT, erc20Address);
      await expectRevert(() => tx2, 'Deposit: holdings[destination][token] is less than expected');
    });
  });

  describe('Depositing ERC20 (expectedHeld + amount < holdings)', () => {
    let receipt;
    let balanceBefore;
    let erc20Holder;
    const randomAddress = ethers.Wallet.createRandom().address;

    beforeAll(async () => {
      erc20Holder = await signer0.getAddress();
      await (await erc20.approve(NitroAdjudicatorAddress, 4)).wait();
      const amountHeld = Number(await NitroAdjudicator.holdings(randomAddress, erc20Address));
      await (await NitroAdjudicator.deposit(randomAddress, amountHeld, 3, erc20Address)).wait();
      balanceBefore = await erc20.balanceOf(erc20Holder);
    });

    it('Nitro holds ERC20s for destination', async () => {
      const holdings = Number(await NitroAdjudicator.holdings(randomAddress, erc20Address));
      await expect(holdings).toBeGreaterThanOrEqual(3);
    });

    it('Nitro has sufficient ERC20 allowance for another deposit', async () => {
      const allowance = Number(await erc20.allowance(erc20Holder, NitroAdjudicatorAddress));
      await expect(allowance).toBeGreaterThanOrEqual(1);
    });

    it('msg.sender has sufficient ERC20 balance for another deposit', async () => {
      const balance = Number(await erc20.balanceOf(erc20Holder));
      await expect(balance).toBeGreaterThanOrEqual(1);
    });

    it('Nitro deposit Transaction succeeds', async () => {
      const amountHeld = Number(await NitroAdjudicator.holdings(randomAddress, erc20Address));
      receipt = await (await NitroAdjudicator.deposit(
        randomAddress,
        amountHeld - 2,
        1,
        erc20Address,
      )).wait();
      await expect(receipt.status).toEqual(1);
    });
    it('Emits Deposit of 0 event ', async () => {
      await expectEvent(receipt, 'Deposited', {
        destination: randomAddress,
        amountDeposited: bigNumberify(0),
      });
    });
    it('ERC20 Balance unchanged', async () => {
      await expect(await erc20.balanceOf(erc20Holder)).toEqual(balanceBefore);
    });
  });

  describe('Depositing ERC20 (amount < holdings < amount + expectedHeld)', () => {
    let receipt;
    let balanceBefore;
    let erc20Holder;
    const randomAddress = ethers.Wallet.createRandom().address;

    beforeAll(async () => {
      erc20Holder = await signer0.getAddress();
      await erc20.approve(NitroAdjudicatorAddress, 3);
      const amountHeld = Number(await NitroAdjudicator.holdings(randomAddress, erc20Address));
      await (await NitroAdjudicator.deposit(randomAddress, amountHeld, 3, erc20Address)).wait();
      // holdings now >= 3
      balanceBefore = Number(await erc20.balanceOf(erc20Holder));
    });

    it('Nitro deposit Transaction succeeds', async () => {
      const amountHeld = Number(await NitroAdjudicator.holdings(randomAddress, erc20Address));
      await erc20.approve(NitroAdjudicatorAddress, amountHeld - 1);
      receipt = await (await NitroAdjudicator.deposit(
        randomAddress,
        2,
        amountHeld - 1,
        erc20Address,
      )).wait();
      await expect(receipt.status).toEqual(1);
    });
    it.skip('Emits Deposit event (partial) ', async () => {
      // several events being emitted?
      // console.log(receipt);
      await expectEvent(receipt, 'Deposited', {
        destination: randomAddress,
        amountDeposited: 1,
      });
    });
    it('Partial refund', async () => {
      await expect(Number(await erc20.balanceOf(erc20Holder))).toEqual(Number(balanceBefore - 1));
    });
  });

  describe('Withdrawing ERC20 (signer = participant, holdings[participant][erc20] >  amount)', () => {
    let beforeBalance;
    let allocatedAtStart;
    const ERC20_WITHDRAWAL_AMOUNT = ERC20_DEPOSIT_AMOUNT;

    it('Nitro holds ERC20s for participant', async () => {
      const tx0 = await erc20.approve(NitroAdjudicatorAddress, ERC20_WITHDRAWAL_AMOUNT);
      await tx0.wait();
      const amountHeld = Number(await NitroAdjudicator.holdings(alice.address, erc20Address));
      await (await NitroAdjudicator.deposit(
        alice.address,
        amountHeld,
        ERC20_WITHDRAWAL_AMOUNT,
        erc20Address,
      )).wait();
      allocatedAtStart = Number(await NitroAdjudicator.holdings(alice.address, erc20Address));
      beforeBalance = Number(await erc20.balanceOf(aliceDest.address));
      await expect(allocatedAtStart).toBeGreaterThanOrEqual(ERC20_WITHDRAWAL_AMOUNT);
    });

    it('Transaction succeeds', async () => {
      const receipt = await (await withdraw(
        alice,
        aliceDest.address,
        alice,
        ERC20_WITHDRAWAL_AMOUNT,
        null,
        erc20Address,
      )).wait();
      await expect(receipt.status).toEqual(1);
    });

    it('Destination balance increases', async () => {
      await expect(Number(await erc20.balanceOf(aliceDest.address))).toEqual(
        beforeBalance + ERC20_WITHDRAWAL_AMOUNT,
      );
    });

    it('holdings[participant][0x] decreases', async () => {
      await expect(Number(await NitroAdjudicator.holdings(alice.address, erc20Address))).toEqual(
        allocatedAtStart - ERC20_WITHDRAWAL_AMOUNT,
      );
    });
  });

  describe('Withdrawing ERC20 (signer =/= partcipant, holdings[participant][erc20] > amount)', () => {
    const ERC20_WITHDRAWAL_AMOUNT = ERC20_DEPOSIT_AMOUNT;

    it('Nitro holds ERC20s for participant', async () => {
      await (await erc20.approve(NitroAdjudicatorAddress, ERC20_WITHDRAWAL_AMOUNT)).wait();
      const amountHeld = Number(await NitroAdjudicator.holdings(alice.address, erc20Address));
      await (await NitroAdjudicator.deposit(
        alice.address,
        amountHeld,
        ERC20_WITHDRAWAL_AMOUNT,
        erc20Address,
      )).wait();
      const allocatedAtStart = Number(await NitroAdjudicator.holdings(alice.address, erc20Address));
      await expect(allocatedAtStart).toBeGreaterThanOrEqual(ERC20_WITHDRAWAL_AMOUNT);
    });

    it('Reverts', async () => {
      const tx2 = withdraw(
        alice,
        aliceDest.address,
        bob,
        ERC20_WITHDRAWAL_AMOUNT,
        null,
        erc20Address,
      );
      await expectRevert(() => tx2, 'Withdraw: not authorized by participant');
    });
  });

  describe('Withdrawing ERC20 (signer = partcipant, holdings[participant][erc20] < amount)', () => {
    let allocatedAtStart;
    const ERC20_WITHDRAWAL_AMOUNT = ERC20_DEPOSIT_AMOUNT;

    it('Nitro holds insufficient ERC20s for participant', async () => {
      await (await erc20.approve(NitroAdjudicatorAddress, ERC20_WITHDRAWAL_AMOUNT)).wait();
      const amountHeld = Number(await NitroAdjudicator.holdings(alice.address, erc20Address));
      await (await NitroAdjudicator.deposit(
        alice.address,
        amountHeld,
        ERC20_WITHDRAWAL_AMOUNT,
        erc20Address,
      )).wait();
      allocatedAtStart = Number(await NitroAdjudicator.holdings(alice.address, erc20Address));
      await expect(allocatedAtStart).toBeGreaterThanOrEqual(ERC20_WITHDRAWAL_AMOUNT);
    });

    it('Reverts', async () => {
      const tx2 = withdraw(
        alice,
        aliceDest.address,
        alice,
        allocatedAtStart + 1,
        null,
        erc20Address,
      );
      await expectRevert(() => tx2, 'Withdraw: overdrawn');
    });
  });

  describe('Transferring ERC20 (outcome = final, holdings[fromChannel] > outcomes[fromChannel].destination', () => {
    let allocatedToChannel;
    let allocatedToAlice;
    const transferAmount = Number(allocation[0]);
    beforeAll(async () => {
      await (await erc20.approve(NitroAdjudicatorAddress, transferAmount)).wait();
      const amountHeldAgainstLedgerChannel = await NitroAdjudicator.holdings(
        getChannelID(ledgerChannel),
        erc20Address,
      );
      await (await NitroAdjudicator.deposit(
        getChannelID(ledgerChannel),
        amountHeldAgainstLedgerChannel,
        transferAmount,
        erc20Address,
      )).wait();
      const allocationOutcome = {
        destination: [alice.address, bob.address],
        allocation,
        finalizedAt: ethers.utils.bigNumberify(1),
        challengeCommitment: getEthersObjectForCommitment(commitment0),
        token: [erc20Address, erc20Address],
      };
      await (await NitroAdjudicator.setOutcome(
        getChannelID(ledgerChannel),
        allocationOutcome,
      )).wait();

      allocatedToChannel = await NitroAdjudicator.holdings(
        getChannelID(ledgerChannel),
        erc20Address,
      );
      allocatedToAlice = await NitroAdjudicator.holdings(alice.address, erc20Address);
    });

    it('Nitro.transfer tx succeeds', async () => {
      const receipt1 = await (await NitroAdjudicator.transfer(
        getChannelID(ledgerChannel),
        alice.address,
        transferAmount,
        erc20Address,
      )).wait();

      await expect(receipt1.status).toEqual(1);
    });

    it('holdings[to][erc20] increases', async () => {
      expect(await NitroAdjudicator.holdings(alice.address, erc20Address)).toEqual(
        allocatedToAlice.add(transferAmount),
      );
    });

    it('holdings[from][erc20] decreases', async () => {
      expect(await NitroAdjudicator.holdings(getChannelID(ledgerChannel), erc20Address)).toEqual(
        allocatedToChannel.sub(allocation[0]),
      );
    });
  });

  describe('Claiming ERC20 from a Guarantor', () => {
    const finalizedAt = ethers.utils.bigNumberify(1);
    let recipient;
    const claimAmount = 2;
    let expectedOutcome;
    let startBal;
    let startBalRecipient;

    beforeAll(async () => {
      recipient = bob.address;
      const guarantee = {
        destination: [bob.address, alice.address],
        allocation: [],
        finalizedAt,
        challengeCommitment: getEthersObjectForCommitment(guarantorCommitment),
        token: [erc20Address, erc20Address],
      };
      const allocationOutcome = {
        destination: [alice.address, bob.address],
        allocation,
        finalizedAt,
        challengeCommitment: getEthersObjectForCommitment(guarantorCommitment),
        token: [erc20Address, erc20Address],
      };
      await (await NitroAdjudicator.setOutcome(guarantor.address, guarantee)).wait();
      await (await NitroAdjudicator.setOutcome(
        getChannelID(ledgerChannel),
        allocationOutcome,
      )).wait();

      startBal = 5;
      await (await erc20.approve(NitroAdjudicatorAddress, startBal)).wait();
      await (await NitroAdjudicator.deposit(guarantor.address, 0, startBal, erc20Address)).wait();

      // Other tests may have deposited into guarantor.address, but we
      // ensure that the guarantor has at least startBal in holdings
      startBal = await NitroAdjudicator.holdings(guarantor.address, erc20Address);
      startBalRecipient = (await NitroAdjudicator.holdings(recipient, erc20Address)).toNumber();
      const bAllocation = bigNumberify(bBal)
        .sub(claimAmount)
        .toHexString();
      const allocationAfterClaim = [aBal, bAllocation];
      expectedOutcome = {
        destination: [alice.address, bob.address],
        allocation: allocationAfterClaim,
        finalizedAt: ethers.utils.bigNumberify(finalizedAt),
        challengeCommitment: getEthersObjectForCommitment(guarantorCommitment),
      };
    });

    it('Nitro.claim tx succeeds', async () => {
      const tx1 = await NitroAdjudicator.claim(
        guarantor.address,
        recipient,
        claimAmount,
        erc20Address,
      );
      const receipt1 = await tx1.wait();
      await expect(receipt1.status).toEqual(1);
    });

    it('New outcome registered', async () => {
      const newOutcome = await NitroAdjudicator.getOutcome(getChannelID(ledgerChannel));
      expect(getOutcomeFromParameters(newOutcome)).toMatchObject(expectedOutcome);
    });

    it('holdings[gurantor][erc20] decreases', async () => {
      expect(Number(await NitroAdjudicator.holdings(guarantor.address, erc20Address))).toEqual(
        startBal - claimAmount,
      );
    });

    it('holdings[recipient][erc20] decreases', async () => {
      expect(Number(await NitroAdjudicator.holdings(recipient, erc20Address))).toEqual(
        startBalRecipient + claimAmount,
      );
    });
  });
});
