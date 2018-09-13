export const TRY_FUNDING_AGAIN = 'WALLETPLAYER.TRYFUNDINGAGAIN';
export const APPROVE_FUNDING = 'WALLETPLAYER.APPROVEFUNDING';
export const DECLINE_FUNDING = 'WALLETPLAYER.DECLINEFUNDING';

export const tryFundingAgain = ()=>  ({
    type: TRY_FUNDING_AGAIN,
});
export const approveFunding = ()=>({
    type: APPROVE_FUNDING,
});
export const declineFunding = () => ({
    type: DECLINE_FUNDING,
})

export type TryFundingAgain = ReturnType<typeof tryFundingAgain>;
export type ApproveFunding = ReturnType<typeof approveFunding>;
export type DeclineFunding = ReturnType<typeof declineFunding>;