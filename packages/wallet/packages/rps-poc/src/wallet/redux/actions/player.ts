export const TRY_FUNDING_AGAIN = 'WALLETPLAYER.TRYFUNDINGAGAIN';
export const APPROVE_FUNDING = 'WALLETPLAYER.APPROVEFUNDING';
export const DECLINE_FUNDING = 'WALLETPLAYER.DECLINEFUNDING';
export const SELECT_WITHDRAWAL_ADDRESS = 'WALLETPLAYER.SELECTWITHDRAWALADDRESS';
export const CLOSE_WALLET = 'WALLETPLAYER.CLOSEWALLET';
export const APPROVE_WITHDRAWAL = 'WALLETPLAYER.APPROVEWITHDRAWAL';

export const tryFundingAgain = () => ({
  type: TRY_FUNDING_AGAIN,
});
export const approveFunding = () => ({
  type: APPROVE_FUNDING,
});
export const declineFunding = () => ({
  type: DECLINE_FUNDING,
});
export const closeWallet = () => ({
  type: CLOSE_WALLET,
});

export const approveWithdrawal= ()=>({
type:APPROVE_WITHDRAWAL,
});

export const selectWithdrawalAddress = (address: string) => ({
  type: SELECT_WITHDRAWAL_ADDRESS as typeof SELECT_WITHDRAWAL_ADDRESS,
  address,
});

export type SelectWithdrawalAddress = ReturnType<typeof selectWithdrawalAddress>;
export type TryFundingAgain = ReturnType<typeof tryFundingAgain>;
export type ApproveFunding = ReturnType<typeof approveFunding>;
export type DeclineFunding = ReturnType<typeof declineFunding>;
