import { SignedCommitment, signCommitment2, CommitmentType } from '..';
import { bigNumberify } from 'ethers/utils';
import { channelID } from 'fmg-core/lib/channel';
import { CONSENSUS_LIBRARY_ADDRESS } from '../../../constants';
import { bytesFromAppAttributes } from 'fmg-nitro-adjudicator';

export const asPrivateKey = '0xf2f48ee19680706196e2e339e5da3491186e0c4c5030670656b0e0164837257d';
export const asAddress = '0x5409ED021D9299bf6814279A6A1411A7e866A631';
export const bsPrivateKey = '0x5d862464fe9303452126c8bc94274b8c5f9874cbd219789b3eb2128075a76f72';
export const bsAddress = '0x6Ecbe1DB9EF729CBe972C83Fb886247691Fb6beb';
export const participants: [string, string] = [asAddress, bsAddress];

export const libraryAddress = '0x' + '1'.repeat(40);
export const channelNonce = 4;
export const channel = { channelType: libraryAddress, nonce: channelNonce, participants };
export const channelId = channelID(channel);

function typeAndCount(
  turnNum: number,
  isFinal: boolean,
): { commitmentCount: number; commitmentType: CommitmentType } {
  let commitmentCount;
  let commitmentType;
  if (isFinal) {
    commitmentCount = 0;
    commitmentType = CommitmentType.Conclude;
  } else if (turnNum < 2) {
    commitmentCount = turnNum;
    commitmentType = CommitmentType.PreFundSetup;
  } else if (turnNum < 4) {
    commitmentCount = turnNum - 2;
    commitmentType = CommitmentType.PostFundSetup;
  } else {
    commitmentType = CommitmentType.App;
    commitmentCount = 0;
  }
  return { commitmentCount, commitmentType };
}

interface Balance {
  address: string;
  wei: string;
}

const twoThree = [
  { address: asAddress, wei: bigNumberify(2).toHexString() },
  { address: bsAddress, wei: bigNumberify(3).toHexString() },
];

interface AppCommitmentParams {
  turnNum: number;
  isFinal?: boolean;
  balances?: Balance[];
  appAttributes?: string;
}

export function appCommitment(params: AppCommitmentParams): SignedCommitment {
  const turnNum = params.turnNum;
  const balances = params.balances || twoThree;
  const isFinal = params.isFinal || false;
  const appAttributes = params.appAttributes || '0x0';
  const allocation = balances.map(b => b.wei);
  const destination = balances.map(b => b.address);
  const { commitmentCount, commitmentType } = typeAndCount(turnNum, isFinal);

  const commitment = {
    channel,
    commitmentCount,
    commitmentType,
    turnNum,
    appAttributes,
    allocation,
    destination,
  };
  const privateKey = turnNum % 2 === 0 ? asPrivateKey : bsPrivateKey;

  return signCommitment2(commitment, privateKey);
}

function ledgerAppAttributes(consensusCounter, balances: Balance[] = twoThree) {
  const proposedAllocation = balances.map(b => b.wei);
  const proposedDestination = balances.map(b => b.address);
  return bytesFromAppAttributes({
    proposedAllocation,
    proposedDestination,
    consensusCounter,
  });
}

interface LedgerCommitmentParams {
  turnNum: number;
  isFinal?: boolean;
  balances?: Balance[];
  proposedBalances?: Balance[];
}

const LEDGER_CHANNEL_NONCE = 0;
export const ledgerChannel = {
  nonce: LEDGER_CHANNEL_NONCE,
  channelType: CONSENSUS_LIBRARY_ADDRESS,
  participants,
};
export const ledgerId = channelID(ledgerChannel);

export function ledgerCommitment(params: LedgerCommitmentParams): SignedCommitment {
  const turnNum = params.turnNum;
  const isFinal = params.isFinal || false;
  const balances = params.balances || twoThree;
  const proposedBalances = params.proposedBalances || balances;
  const consensusCounter = JSON.stringify(balances) === JSON.stringify(proposedBalances) ? 0 : 1;
  const allocation = balances.map(b => b.wei);
  const destination = balances.map(b => b.address);
  const { commitmentCount, commitmentType } = typeAndCount(turnNum, isFinal);
  const appAttributes = ledgerAppAttributes(consensusCounter, proposedBalances);
  const commitment = {
    channel: ledgerChannel,
    commitmentCount,
    commitmentType,
    turnNum,
    appAttributes,
    allocation,
    destination,
  };

  const privateKey = turnNum % 2 === 0 ? asPrivateKey : bsPrivateKey;

  return signCommitment2(commitment, privateKey);
}
