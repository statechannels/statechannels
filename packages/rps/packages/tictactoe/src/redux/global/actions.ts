export const TOGGLE_RULES_VISIBILITY = 'APP.TOGGLE_RULES_VISIBILITY';
export const toggleRulesVisibility = () => ({
  type: TOGGLE_RULES_VISIBILITY as typeof TOGGLE_RULES_VISIBILITY,
});
export type ToggleRulesVisibility = ReturnType<typeof toggleRulesVisibility>;

export const SHOW_WALLET = 'APP.SHOW_WALLET';
export const showWallet = () => ({
  type: SHOW_WALLET as typeof SHOW_WALLET,
});
export type showWallet = ReturnType<typeof showWallet>;

export const HIDE_WALLET = 'APP.HIDE_WALLET';
export const hideWallet = () => ({
  type: HIDE_WALLET as typeof HIDE_WALLET,
});
export type hideWallet = ReturnType<typeof hideWallet>;
