import { ethers } from 'ethers';

import { put } from 'redux-saga/effects';
import { getGanacheProvider } from 'magmo-devtools';

import { transactionConfirmed, transactionSent, transactionSubmitted } from '../redux/actions';
import { transactionSender } from '../redux/sagas/transaction-sender';
import { signCommitment, signVerificationData, signCommitment2 } from '../domain';
import { getLibraryAddress, createChallenge, concludeGame } from './test-utils';
import {
  createForceMoveTransaction,
  createDepositTransaction,
  createRespondWithMoveTransaction,
  createRefuteTransaction,
  createConcludeTransaction,
  createWithdrawTransaction,
  ConcludeAndWithdrawArgs,
  createConcludeAndWithdrawTransaction,
  createTransferAndWithdrawTransaction,
} from '../utils/transaction-generator';

import { depositContract } from './test-utils';
import { Channel, Commitment, CommitmentType } from 'fmg-core';
import { channelID } from 'fmg-core/lib/channel';
import { ADJUDICATOR_ADDRESS } from '../constants';

jest.setTimeout(90000);
// TODO: Re-enable/fix tests
describe('transactions', () => {
  let networkId;
  let libraryAddress;
  let nonce = 5;
  const provider: ethers.providers.JsonRpcProvider = getGanacheProvider();

  const participantA = ethers.Wallet.createRandom();
  const participantB = ethers.Wallet.createRandom();
  const participants = [participantA.address, participantB.address] as [string, string];

  function getNextNonce() {
    return ++nonce;
  }

  async function testTransactionSender(transactionToSend) {
    const processId = 'processId';
    const queuedTransaction = { transactionRequest: transactionToSend, processId };
    const saga = transactionSender(queuedTransaction);
    saga.next();
    expect(saga.next(provider).value).toEqual(put(transactionSent({ processId })));
    saga.next();
    const signer = provider.getSigner();
    transactionToSend = { ...transactionToSend, to: ADJUDICATOR_ADDRESS };
    const transactionReceipt = await signer.sendTransaction(transactionToSend);

    expect(saga.next(transactionReceipt).value).toEqual(
      put(transactionSubmitted({ processId, transactionHash: transactionReceipt.hash || '' })),
    );
    const confirmedTransaction = await transactionReceipt.wait();
    saga.next();
    expect(saga.next(confirmedTransaction).value).toEqual(
      put(
        transactionConfirmed({ processId, contractAddress: confirmedTransaction.contractAddress }),
      ),
    );

    expect(saga.next().done).toBe(true);
  }

  beforeAll(async () => {
    const network = await provider.getNetwork();
    networkId = network.chainId;
    libraryAddress = getLibraryAddress(networkId);
  });

  it.skip('should deposit into the contract', async () => {
    const depositTransaction = createDepositTransaction(participantA.address, '0x5', '0x0');
    await testTransactionSender(depositTransaction);
  });

  it.skip('should send a forceMove transaction', async () => {
    const channel: Channel = { channelType: libraryAddress, nonce: getNextNonce(), participants };
    await depositContract(provider, participantA.address);
    await depositContract(provider, participantB.address);

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

    const forceMoveTransaction = createForceMoveTransaction(
      signCommitment2(fromCommitment, participantA.privateKey),
      signCommitment2(toCommitment, participantB.privateKey),
      participantA.privateKey,
    );
    await testTransactionSender(forceMoveTransaction);
  });

  it.skip('should send a respondWithMove transaction', async () => {
    const channel: Channel = { channelType: libraryAddress, nonce: getNextNonce(), participants };
    const { nonce: channelNonce } = channel;
    await depositContract(provider, participantA.address);
    await depositContract(provider, participantB.address);
    await createChallenge(provider, channelNonce, participantA, participantB);
    const toCommitment: Commitment = {
      channel,
      allocation: ['0x05', '0x05'],
      destination: [participantA.address, participantB.address],
      turnNum: 7,
      commitmentType: CommitmentType.App,
      appAttributes: '0x0',
      commitmentCount: 1,
    };

    const respondWithMoveTransaction = createRespondWithMoveTransaction(
      toCommitment,
      participantB.privateKey,
    );
    await testTransactionSender(respondWithMoveTransaction);
  });

  it.skip('should send a refute transaction', async () => {
    const channel: Channel = { channelType: libraryAddress, nonce: getNextNonce(), participants };
    const { nonce: channelNonce } = channel;
    await depositContract(provider, participantA.address);
    await depositContract(provider, participantB.address);
    await createChallenge(provider, channelNonce, participantA, participantB);
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

    const refuteTransaction = createRefuteTransaction(toCommitment, toSig);
    await testTransactionSender(refuteTransaction);
  });

  it.skip('should send a conclude transaction', async () => {
    const channel: Channel = { channelType: libraryAddress, nonce: getNextNonce(), participants };
    await depositContract(provider, participantA.address);
    await depositContract(provider, participantB.address);
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
    const signedFromCommitment = signCommitment2(fromCommitment, participantA.privateKey);
    const signedToCommitment = signCommitment2(toCommitment, participantB.privateKey);

    const concludeTransaction = createConcludeTransaction(signedFromCommitment, signedToCommitment);
    await testTransactionSender(concludeTransaction);
  });

  it.skip('should send a transferAndWithdraw transaction', async () => {
    const channel: Channel = { channelType: libraryAddress, nonce: getNextNonce(), participants };
    const channelId = channelID(channel);
    await depositContract(provider, channelId);
    await depositContract(provider, channelId);
    await concludeGame(provider, channel.nonce, participantA, participantB);
    const senderAddress = await provider.getSigner().getAddress();
    const verificationSignature = signVerificationData(
      participantA.address,
      participantA.address,
      '0x01',
      senderAddress,
      participantA.privateKey,
    );
    const transferAndWithdraw = createTransferAndWithdrawTransaction(
      channelId,
      participantA.address,
      participantA.address,
      '0x01',
      verificationSignature,
    );
    await testTransactionSender(transferAndWithdraw);
  });

  it.skip('should send a withdraw transaction', async () => {
    await depositContract(provider, participantA.address);
    const senderAddress = await provider.getSigner().getAddress();
    const verificationSignature = signVerificationData(
      participantA.address,
      participantA.address,
      '0x01',
      senderAddress,
      participantA.privateKey,
    );
    const withdrawTransaction = createWithdrawTransaction(
      '0x01',
      participantA.address,
      participantA.address,
      verificationSignature,
    );
    await testTransactionSender(withdrawTransaction);
  });

  it.skip('should send a conclude and withdraw transaction', async () => {
    const channel: Channel = { channelType: libraryAddress, nonce: getNextNonce(), participants };
    const channelId = channelID(channel);
    await depositContract(provider, channelId);
    const senderAddress = await provider.getSigner().getAddress();
    const verificationSignature = signVerificationData(
      participantA.address,
      participantA.address,
      '0x05',
      senderAddress,
      participantA.privateKey,
    );
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
    const concludeAndWithdrawTransaction = createConcludeAndWithdrawTransaction(args);
    await testTransactionSender(concludeAndWithdrawTransaction);
  });
});
