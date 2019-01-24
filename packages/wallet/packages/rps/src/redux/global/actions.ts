export const TOGGLE_VISIBILITY = 'RULES.TOGGLE_VISIBILITY';

export const toggleVisibility = () => ({
  type: TOGGLE_VISIBILITY as typeof TOGGLE_VISIBILITY,
});

export type ToggleVisibility = ReturnType<typeof toggleVisibility>;
