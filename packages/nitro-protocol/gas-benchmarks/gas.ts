type GasRequiredTo = Record<
  Path,
  {
    vanillaNitro: any;
  }
>;

type Path =
  | 'deployInfrastructureContracts'
  | 'directlyFundAChannelWithETHFirst'
  | 'directlyFundAChannelWithETHSecond'
  | 'directlyFundAChannelWithERC20First'
  | 'directlyFundAChannelWithERC20Second'
  | 'ETHexit';

export const gasRequiredTo: GasRequiredTo = {
  deployInfrastructureContracts: {
    vanillaNitro: {
      NitroAdjudicator: 2421626, // Singleton
      ETHAssetHolder: 1652745, // Singleton (could be more in principle)
      ERC20AssetHolder: 1676144, // Per Token (could be more in principle)
    },
  },
  directlyFundAChannelWithETHFirst: {
    vanillaNitro: 47608,
  },
  directlyFundAChannelWithETHSecond: {
    // meaning the second participant in the channel
    vanillaNitro: 30520,
  },
  directlyFundAChannelWithERC20First: {
    // The depositor begins with zero tokens approved for the AssetHolder
    // The AssetHolder begins with some token balance already
    // The depositor retains a nonzero balance of tokens after depositing
    // The depositor retains some tokens approved for the AssetHolder after depositing
    vanillaNitro: {
      approve: 46383,
      // ^^^^^
      // In principle this only needs to be done once per account
      // (the cost may be amortized over several deposits into this AssetHolder)
      deposit: 72854,
    },
  },
  directlyFundAChannelWithERC20Second: {
    // meaning the second participant in the channel
    vanillaNitro: {
      approve: 46383,
      // ^^^^^
      // In principle this only needs to be done once per account
      // (the cost may be amortized over several deposits into this AssetHolder)
      deposit: 55766,
    },
  },
  ETHexit: {
    // we completely liquidate the channel (paying out both parties)
    vanillaNitro: 146807,
  },
};
