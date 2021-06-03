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
  | 'directlyFundAChannelWithERC20Second';

export const gasRequiredTo: GasRequiredTo = {
  deployInfrastructureContracts: {
    vanillaNitro: {
      NitroAdjudicator: 2421626, // Singleton
      ETHAssetHolder: 1632711, // Singleton (could be more in principle)
      ERC20AssetHolder: 1654810, // Per Token (could be more in principle)
    },
  },
  directlyFundAChannelWithETHFirst: {
    vanillaNitro: 48996,
  },
  directlyFundAChannelWithETHSecond: {
    // meaning the second participant in the channel
    vanillaNitro: 34008,
  },
  directlyFundAChannelWithERC20First: {
    // The depositor begins with zero tokens approved for the AssetHolder
    // The AssetHolder begins with some token balance already
    // The depositor retains a nonzero balance of tokens after depositing
    // The depositor retains some tokens approved for the AssetHolder after depositing
    vanillaNitro: {
      approve: 45083,
      // ^^^^^
      // In principle this only needs to be done once per account
      // (the cost may be amortized over several deposits into this AssetHolder)
      deposit: 73442,
    },
  },
  directlyFundAChannelWithERC20Second: {
    // meaning the second participant in the channel
    vanillaNitro: {
      approve: 45083,
      // ^^^^^
      // In principle this only needs to be done once per account
      // (the cost may be amortized over several deposits into this AssetHolder)
      deposit: 58454,
    },
  },
};
