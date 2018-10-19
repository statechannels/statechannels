export const SHOW_WALLET = 'WALLET.SHOW';
export const HIDE_WALLET = 'WALLET.HIDE';
export const SHOW_WALLET_HEADER = 'WALLET.SHOW_HEADER';
export const HIDE_WALLET_HEADER  = 'WALLET.HIDE_HEADER';

export const showWallet = () => ({
  type: SHOW_WALLET as typeof SHOW_WALLET,
});
export const hideWallet = () => ({
  type: HIDE_WALLET as typeof HIDE_WALLET,
});
export const showHeader = () => ({
    type: SHOW_WALLET_HEADER as typeof SHOW_WALLET_HEADER,
  });
  export const hideHeader = () => ({
    type: HIDE_WALLET_HEADER as typeof HIDE_WALLET_HEADER,
  });

export type ShowWallet = ReturnType<typeof showWallet>;
export type HideWallet = ReturnType<typeof hideWallet>;
export type ShowHeader = ReturnType<typeof showHeader>;
export type HideHeader = ReturnType<typeof hideHeader>;
