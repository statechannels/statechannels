type GasRequiredTo = Record<
  string,
  {
    vanillaNitro: number;
    // ninjaNitro: number; monoNitro: number // TODO
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
