export const TRY_FUNDING_AGAIN = 'WALLETPLAYER.TRYFUNDINGAGAIN'

export const tryFundingAgain = ()=>  ({
    type: TRY_FUNDING_AGAIN,
});

export type TryFundingAgain = ReturnType<typeof tryFundingAgain>;