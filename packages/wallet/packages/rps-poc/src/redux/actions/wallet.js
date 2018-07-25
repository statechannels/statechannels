export const types = {
  SYNC_WALLET: 'SYNC_WALLET',
};

export const syncWallet = (wallet) => ({
  type: types.SYNC_WALLET,
  wallet
});
