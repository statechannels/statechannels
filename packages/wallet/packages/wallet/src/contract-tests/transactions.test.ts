import { ethers } from "ethers";

import { put } from "redux-saga/effects";

import { transactionConfirmed, transactionFinalized, transactionSentToMetamask, transactionSubmitted } from '../redux/actions';
import { transactionSender } from "../redux/sagas/transaction-sender";
import { signCommitment, signVerificationData } from '../utils/signing-utils';
import { getLibraryAddress, createChallenge, concludeGame } from './test-utils';
import {
  createForceMoveTransaction, createDepositTransaction, createRespondWithMoveTransaction, createRefuteTransaction, createConcludeTransaction, createWithdrawTransaction, ConcludeAndWithdrawArgs, createConcludeAndWithdrawTransaction, createTransferAndWithdrawTransaction
} from '../utils/transaction-generator';

import { depositContract } from './test-utils';
import { Channel, Commitment, CommitmentType } from 'fmg-core';
import { getAdjudicatorContractAddress } from '../utils/contract-utils';
import { channelID } from 'fmg-core/lib/channel';

jest.setTimeout(90000);

describe('transactions', () => {
  let networkId;
  let libraryAddress;
  let nonce = 5;
  const provider: ethers.providers.JsonRpcProvider = new ethers.providers.JsonRpcProvider(`http://localhost:${process.env.DEV_GANACHE_PORT}`);

  const participantA = ethers.Wallet.createRandom();
  const participantB = ethers.Wallet.createRandom();
  const participants = [participantA.address, participantB.address] as [string, string];

  function getNextNonce() {
    return ++nonce;
  }
  async function testTransactionSender(transactionToSend) {
    const saga = transactionSender(transactionToSend);
    saga.next();
    expect(saga.next(provider).value).toEqual(put(transactionSentToMetamask()));
    const signer = provider.getSigner();
    const transactionReceipt = await signer.sendTransaction(transactionToSend);

    saga.next();
    expect(saga.next(transactionReceipt).value).toEqual(put(transactionSubmitted(transactionReceipt.hash || "")));
    const confirmedTransaction = await transactionReceipt.wait();
    saga.next();
    expect(saga.next(confirmedTransaction).value).toEqual(put(transactionConfirmed(confirmedTransaction.contractAddress)));

    //  saga.next();
    expect(saga.next().value).toEqual(put(transactionFinalized()));
    expect(saga.next().done).toBe(true);

  }

  beforeAll(async () => {
    const network = await provider.getNetwork();
    networkId = network.chainId;
    libraryAddress = getLibraryAddress(networkId);
  });



  it('should deposit into the contract', async () => {
    const contractAddress = await getAdjudicatorContractAddress(provider);
    const depositTransaction = createDepositTransaction(contractAddress, participantA.address, '0x5');
    await testTransactionSender(depositTransaction);
  });

  it("should send a forceMove transaction", async () => {
    const channel: Channel = { channelType: libraryAddress, nonce: getNextNonce(), participants };
    const contractAddress = await getAdjudicatorContractAddress(provider);
    await depositContract(provider, contractAddress, participantA.address);
    await depositContract(provider, contractAddress, participantB.address);

    const fromCommitment: Commitment = {
      channel,
      allocation: ['0x05', '0x05'],
      destination: [participantA.address, participantB.address],
      turnNum: 5,
      commitmentType: CommitmentType.App,
      appAttributes: '0x0',
      commitmentCount: 0,
    };

    const toCommitment: Commitment = {
      channel,
      allocation: ['0x05', '0x05'],
      destination: [participantA.address, participantB.address],
      turnNum: 6,
      commitmentType: CommitmentType.App,
      appAttributes: '0x0',
      commitmentCount: 1,
    };
    const fromSig = signCommitment(fromCommitment, participantB.privateKey);
    const toSig = signCommitment(toCommitment, participantA.privateKey);

    const forceMoveTransaction = createForceMoveTransaction(contractAddress, fromCommitment, toCommitment, fromSig, toSig);
    await testTransactionSender(forceMoveTransaction);

  });

  it("should send a respondWithMove transaction", async () => {
    const channel: Channel = { channelType: libraryAddress, nonce: getNextNonce(), participants };
    const { nonce: channelNonce } = channel;
    const contractAddress = await getAdjudicatorContractAddress(provider);
    await depositContract(provider, contractAddress, participantA.address);
    await depositContract(provider, contractAddress, participantB.address);
    await createChallenge(provider, contractAddress, channelNonce, participantA, participantB);
    const toCommitment: Commitment = {
      channel,
      allocation: ['0x05', '0x05'],
      destination: [participantA.address, participantB.address],
      turnNum: 7,
      commitmentType: CommitmentType.App,
      appAttributes: '0x0',
      commitmentCount: 1,
    };

    const toSig = signCommitment(toCommitment, participantB.privateKey);

    const respondWithMoveTransaction = createRespondWithMoveTransaction(contractAddress, toCommitment, toSig);
    await testTransactionSender(respondWithMoveTransaction);
  });

  it("should send a refute transaction", async () => {
    const channel: Channel = { channelType: libraryAddress, nonce: getNextNonce(), participants };
    const { nonce: channelNonce } = channel;
    const contractAddress = await getAdjudicatorContractAddress(provider);
    await depositContract(provider, contractAddress, participantA.address);
    await depositContract(provider, contractAddress, participantB.address);
    await createChallenge(provider, contractAddress, channelNonce, participantA, participantB);
    const toCommitment: Commitment = {
      channel,
      allocation: ['0x05', '0x05'],
      destination: [participantA.address, participantB.address],
      turnNum: 8,
      commitmentType: CommitmentType.App,
      appAttributes: '0x0',
      commitmentCount: 1,
    };

    const toSig = signCommitment(toCommitment, participantA.privateKey);

    const refuteTransaction = createRefuteTransaction(contractAddress, toCommitment, toSig);
    await testTransactionSender(refuteTransaction);
  });

  it("should send a conclude transaction", async () => {
    const channel: Channel = { channelType: libraryAddress, nonce: getNextNonce(), participants };
    const contractAddress = await getAdjudicatorContractAddress(provider);
    await depositContract(provider, contractAddress, participantA.address);
    await depositContract(provider, contractAddress, participantB.address);
    const fromCommitment: Commitment = {
      channel,
      allocation: ['0x05', '0x05'],
      destination: [participantA.address, participantB.address],
      turnNum: 5,
      commitmentType: CommitmentType.Conclude,
      appAttributes: '0x0',
      commitmentCount: 0,
    };

    const toCommitment: Commitment = {
      channel,
      allocation: ['0x05', '0x05'],
      destination: [participantA.address, participantB.address],
      turnNum: 6,
      commitmentType: CommitmentType.Conclude,
      appAttributes: '0x0',
      commitmentCount: 1,
    };
    const fromSignature = signCommitment(fromCommitment, participantA.privateKey);
    const toSignature = signCommitment(toCommitment, participantB.privateKey);

    const concludeTransaction = createConcludeTransaction(contractAddress, fromCommitment, toCommitment, fromSignature, toSignature);
    await testTransactionSender(concludeTransaction);
  });

  it("should send a transferAndWithdraw transaction", async () => {
    const channel: Channel = { channelType: libraryAddress, nonce: getNextNonce(), participants };
    const channelId = channelID(channel);
    const contractAddress = await getAdjudicatorContractAddress(provider);
    await depositContract(provider, contractAddress, channelId);
    await depositContract(provider, contractAddress, channelId);
    await concludeGame(provider, contractAddress, channel.nonce, participantA, participantB);
    const senderAddress = await provider.getSigner().getAddress();
    const verificationSignature = signVerificationData(participantA.address, participantA.address, '0x01', senderAddress, participantA.privateKey);
    const transferAndWithdraw = createTransferAndWithdrawTransaction(contractAddress, channelId, participantA.address, participantA.address, '0x01', verificationSignature);
    await testTransactionSender(transferAndWithdraw);
  });

  it("should send a withdraw transaction", async () => {
    const contractAddress = await getAdjudicatorContractAddress(provider);
    await depositContract(provider, contractAddress, participantA.address);
    const senderAddress = await provider.getSigner().getAddress();
    const verificationSignature = signVerificationData(participantA.address, participantA.address, '0x01', senderAddress, participantA.privateKey);
    const withdrawTransaction = createWithdrawTransaction(contractAddress, '0x01', participantA.address, participantA.address, verificationSignature);
    await testTransactionSender(withdrawTransaction);
  });

  it("should send a conclude and withdraw transaction", async () => {
    const channel: Channel = { channelType: libraryAddress, nonce: getNextNonce(), participants };
    const channelId = channelID(channel);
    const contractAddress = await getAdjudicatorContractAddress(provider);
    await depositContract(provider, contractAddress, channelId);
    const senderAddress = await provider.getSigner().getAddress();
    const verificationSignature = signVerificationData(participantA.address, participantA.address, '0x05', senderAddress, participantA.privateKey);
    const fromCommitment: Commitment = {
      channel,
      allocation: ['0x05', '0x05'],
      destination: [participantA.address, participantB.address],
      turnNum: 5,
      commitmentType: CommitmentType.Conclude,
      appAttributes: '0x0',
      commitmentCount: 0,
    };

    const toCommitment: Commitment = {
      channel,
      allocation: ['0x05', '0x05'],
      destination: [participantA.address, participantB.address],
      turnNum: 6,
      commitmentType: CommitmentType.Conclude,
      appAttributes: '0x0',
      commitmentCount: 1,
    };
    const fromSignature = signCommitment(fromCommitment, participantA.privateKey);
    const toSignature = signCommitment(toCommitment, participantB.privateKey);

    const args: ConcludeAndWithdrawArgs = {
      fromCommitment,
      toCommitment,
      fromSignature,
      toSignature,
      verificationSignature,
      participant: participantA.address,
      destination: participantA.address,
      amount: '0x05',
    };
    const concludeAndWithdrawTransaction = createConcludeAndWithdrawTransaction(contractAddress, args);
    await testTransactionSender(concludeAndWithdrawTransaction);
  });
});