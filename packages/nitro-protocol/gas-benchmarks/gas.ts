type GasRequiredTo = Record<
  Path,
  {
    vanillaNitro: number | any;
  }
>;

type Path =
  | 'deployInfrastructureContracts'
  | 'directlyFundAChannelWithETHFirst'
  | 'directlyFundAChannelWithETHSecond';

export const gasRequiredTo: GasRequiredTo = {
  deployInfrastructureContracts: {
    vanillaNitro: {
      NitroAdjudicator: 2421626, // Singleton
      ETHAssetHolder: 1632711, // Singleton (could be more in principle)
      ERC20AssetHolder: 1654810, // Per Token (could be more in principle)
    },
  },
  directlyFundAChannelWithETHFirst: {
    vanillaNitro: 49008,
  },
  directlyFundAChannelWithETHSecond: {
    vanillaNitro: 34020,
  },
};
