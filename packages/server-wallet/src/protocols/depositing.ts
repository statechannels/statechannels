import {right} from 'fp-ts/lib/Either';
import {none, some} from 'fp-ts/lib/Option';
import {BN} from '@statechannels/wallet-core';

import {match} from '../match';
import {Address, Uint256} from '../type-aliases';

import {Protocol, ChannelState, ProtocolResult} from './state';

export type ProtocolState = ChannelState & {
  assetHolderAddress: Address;
  amountToDeposit: Uint256;
  safeToDepositAmount: Uint256;
  fundedAt: Uint256;
  depositTransactionId: string | undefined;
};
type FundingStatus = 'Not Safe to Deposit' | 'Safe to Deposit' | 'Funded';

const submitTransaction = async (): ProtocolResult =>
  right(
    some({
      type: 'SubmitTransaction',
      transactionRequest: {},
      transactionId: '0x123',
    })
  );

const getFundingStatus = (ps: ProtocolState): FundingStatus => {
  const currentFunding = ps.funding[ps.assetHolderAddress] || '0x0';
  if (BN.gte(currentFunding, ps.fundedAt)) {
    return 'Funded';
  } else if (BN.gte(currentFunding, ps.safeToDepositAmount)) {
    return 'Safe to Deposit';
  } else {
    return 'Not Safe to Deposit';
  }
};
type TransactionStatus = 'No Transaction Submitted' | 'Transaction Submitted';
const determineTransactionStatus = (ps: ProtocolState): TransactionStatus =>
  ps.depositTransactionId ? 'Transaction Submitted' : 'No Transaction Submitted';

const safeToDeposit: Protocol<ProtocolState> = match(determineTransactionStatus, {
  'No Transaction Submitted': submitTransaction,
  'Transaction Submitted': async () => Promise.resolve(right(none)),
});

export const protocol: Protocol<ProtocolState> = match(getFundingStatus, {
  'Safe to Deposit': safeToDeposit,
  Default: async () => Promise.resolve(right(none)),
});
