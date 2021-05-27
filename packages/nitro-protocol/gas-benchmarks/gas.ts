type GasRequiredTo = Record<
  string,
  {
    vanillaNitro: number;
  }
>;

export const gasRequiredTo: GasRequiredTo = {
  directlyFundAChannelWithETHFirst: {
    vanillaNitro: 49008,
  },
  directlyFundAChannelWithETHSecond: {
    vanillaNitro: 34020,
  },
};
