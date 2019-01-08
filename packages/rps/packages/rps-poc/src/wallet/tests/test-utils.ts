import { ethers } from 'ethers';
import { getLibraryAddress } from '../utils/contract-utils';
import { Channel } from 'fmg-core';
import { createDeployTransaction, createDepositTransaction, createForceMoveTransaction, createConcludeTransaction, createRefuteTransaction, createRespondWithMoveTransaction, } from '../utils/transaction-generator';
import { positions, Move, encode } from '../../core';
import { signPositionHex } from '../utils/signing-utils';
import { randomHex } from '../../utils/randomHex';
import BN from 'bn.js';
import bnToHex from '../../utils/bnToHex';

export const fiveFive = [new BN(5), new BN(5)].map(bnToHex) as [string, string];
export const fourSix = [new BN(4), new BN(6)].map(bnToHex) as [string, string];

export async function deployContract(channelNonce, participantA, participantB) {
  const provider: ethers.providers.JsonRpcProvider = new ethers.providers.JsonRpcProvider('http://localhost:8545');
  const signer = provider.getSigner();
  const network = await provider.getNetwork();
  const networkId = network.chainId;
  const libraryAddress = getLibraryAddress(networkId);
  const channel = new Channel(libraryAddress, channelNonce, [participantA.address, participantB.address]);
  const deployTransaction = createDeployTransaction(networkId, channel.id, '0x5');
  const transactionReceipt = await signer.sendTransaction(deployTransaction);
  const confirmedTransaction = await transactionReceipt.wait();

  return confirmedTransaction.contractAddress as string;
}

export async function depositContract(address) {
  const provider: ethers.providers.JsonRpcProvider = new ethers.providers.JsonRpcProvider('http://localhost:8545');
  const signer = provider.getSigner();
  const deployTransaction = createDepositTransaction(address, '0x5');
  const transactionReceipt = await signer.sendTransaction(deployTransaction);
  await transactionReceipt.wait();
}

export async function createChallenge(address, channelNonce, participantA, participantB) {
  const provider: ethers.providers.JsonRpcProvider = new ethers.providers.JsonRpcProvider('http://localhost:8545');
  const signer = provider.getSigner();
  const network = await provider.getNetwork();
  const networkId = network.chainId;
  const libraryAddress = getLibraryAddress(networkId);
  const baseMoveArgs = {
    salt: randomHex(64),
    asMove: Move.Rock,
    roundBuyIn: '0x1',
    participants: [participantA.address, participantB.address] as [string, string],
  };

  const proposeArgs = {
    ...baseMoveArgs,
    turnNum: 5,
    balances: fiveFive,
    libraryAddress,
    channelNonce,
  };

  const acceptArgs = {
    ...baseMoveArgs,
    preCommit: positions.hashCommitment(baseMoveArgs.asMove, baseMoveArgs.salt),
    bsMove: Move.Paper,
    turnNum: 6,
    balances: fourSix,
    libraryAddress,
    channelNonce,
  };

  const fromPosition = encode(positions.proposeFromSalt(proposeArgs));
  const toPosition = encode(positions.accept(acceptArgs));
  const fromSig = signPositionHex(fromPosition, participantB.privateKey);
  const toSig = signPositionHex(toPosition, participantA.privateKey);
  const challengeTransaction = createForceMoveTransaction(address, fromPosition, toPosition, fromSig, toSig);
  const transactionReceipt = await signer.sendTransaction(challengeTransaction);
  await transactionReceipt.wait();
  return toPosition;
}

export async function concludeGame(address, channelNonce, participantA, participantB) {
  const provider: ethers.providers.JsonRpcProvider = new ethers.providers.JsonRpcProvider('http://localhost:8545');
  const signer = provider.getSigner();
  const network = await provider.getNetwork();
  const networkId = network.chainId;
  const libraryAddress = getLibraryAddress(networkId);

  const concludeArgs = {
    salt: randomHex(64),
    asMove: Move.Rock,
    roundBuyIn: '0x1',
    participants: [participantA.address, participantB.address] as [string, string],
    balances: fiveFive,
    libraryAddress,
    channelNonce,

  };
  const fromState = encode(positions.conclude({ ...concludeArgs, turnNum: 50 }));
  const fromSignature = signPositionHex(fromState, participantA.privateKey);
  const toState = encode(positions.conclude({ ...concludeArgs, turnNum: 51 }));
  const toSignature = signPositionHex(toState, participantB.privateKey);

  const concludeTransaction = createConcludeTransaction(address, fromState, toState, fromSignature, toSignature);
  const transactionReceipt = await signer.sendTransaction(concludeTransaction);
  await transactionReceipt.wait();
}

export async function respondWithMove(address, channelNonce, participantA, participantB) {
  const provider: ethers.providers.JsonRpcProvider = new ethers.providers.JsonRpcProvider('http://localhost:8545');
  const signer = provider.getSigner();
  const network = await provider.getNetwork();
  const networkId = network.chainId;
  const libraryAddress = getLibraryAddress(networkId);
  const participants = [participantA.address, participantB.address] as [string, string];

  const revealArgs = {
    turnNum: 7,
    balances: fourSix,
    salt: randomHex(64),
    asMove: Move.Rock,
    bsMove: Move.Paper,
    roundBuyIn: '0x1',
    libraryAddress,
    channelNonce,
    participants,
  };

  const toPosition = encode(positions.reveal(revealArgs));
  const toSig = signPositionHex(toPosition, participantB.privateKey);

  const respondWithMoveTransaction = createRespondWithMoveTransaction(address, toPosition, toSig);
  const transactionReceipt = await signer.sendTransaction(respondWithMoveTransaction);
  await transactionReceipt.wait();
  return toPosition;
}

export async function refuteChallenge(address, channelNonce, participantA, participantB) {
  const provider: ethers.providers.JsonRpcProvider = new ethers.providers.JsonRpcProvider('http://localhost:8545');
  const signer = provider.getSigner();
  const network = await provider.getNetwork();
  const networkId = network.chainId;
  const libraryAddress = getLibraryAddress(networkId);
  const secondProposeArgs = {
    salt: randomHex(64),
    asMove: Move.Rock,
    roundBuyIn: '0x1',
    participants: [participantA.address, participantB.address] as [string, string],
    turnNum: 100,
    balances: fiveFive,
    channelNonce,
    libraryAddress,
  };

  const toPosition = encode(positions.proposeFromSalt(secondProposeArgs));
  const toSig = signPositionHex(toPosition, participantA.privateKey);
  const refuteTransaction = createRefuteTransaction(address, toPosition, toSig);
  const transactionReceipt = await signer.sendTransaction(refuteTransaction);
  await transactionReceipt.wait();
  return toPosition;
}