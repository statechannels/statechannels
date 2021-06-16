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
  | 'ETHexit'
  | 'ERC20exit'
  | 'ETHexitSad'
  | 'ETHexitSadLedgerFunded';

// The channel being benchmarked is a 2 party null app funded with 5 wei / tokens each.

export const gasRequiredTo: GasRequiredTo = {
  deployInfrastructureContracts: {
    vanillaNitro: {
      NitroAdjudicator: 2421830, // Singleton
      ETHAssetHolder: 1634011, // Singleton (could be more in principle)
      ERC20AssetHolder: 1657410, // Per Token (could be more in principle)
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
    // We completely liquidate the channel (paying out both parties)
    vanillaNitro: 146793,
  },
  ERC20exit: {
    // We completely liquidate the channel (paying out both parties)
    vanillaNitro: 139148,
  },
  ETHexitSad: {
    // Scenario: counterparty goes offline
    vanillaNitro: {
      challenge: 93404,
      pushOutcomeAndTransferAll: 107742,
      total: 201146, // An alternative would be to 1. pushOutcome then 2. transfer(indices)
      // ...but we assume that costs more gas overall
    },
  },
  ETHexitSadLedgerFunded: {
    // Scenario: counterparty goes offline
    vanillaNitro: {
      challengeX: 93404,
      challengeL: 92122,
      pushOutcomeAndTransferAllL: 58640,
      pushOutcomeAndTransferAllX: 107742,
      total: 351908, // An alternative would be to 1. pushOutcome then 2. transfer(indices)
      // ...but we assume that costs more gas overall
    },
  },
};
