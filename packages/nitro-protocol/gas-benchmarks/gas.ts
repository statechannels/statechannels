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
  | 'ETHexitSadLedgerFunded'
  | 'ETHexitSadVirtualFunded'
  | 'ETHexitSadLedgerFunded';

// The channel being benchmarked is a 2 party null app funded with 5 wei / tokens each.
// KEY
// ---
// ⬛ -> funding on chain (from Alice)
//  C    channel not yet on chain
// (C)   channel finalized on chain
// 👩    Alice's external destination (e.g. her EOA)
export const gasRequiredTo: GasRequiredTo = {
  deployInfrastructureContracts: {
    vanillaNitro: {
      NitroAdjudicator: 4180221, // Singleton
    },
  },
  directlyFundAChannelWithETHFirst: {
    vanillaNitro: 48014,
  },
  directlyFundAChannelWithETHSecond: {
    // meaning the second participant in the channel
    vanillaNitro: 30926,
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
      deposit: 71392,
    },
  },
  directlyFundAChannelWithERC20Second: {
    // meaning the second participant in the channel
    vanillaNitro: {
      approve: 46383,
      // ^^^^^
      // In principle this only needs to be done once per account
      // (the cost may be amortized over several deposits into this AssetHolder)
      deposit: 54304,
    },
  },
  ETHexit: {
    // We completely liquidate the channel (paying out both parties)
    vanillaNitro: 133112,
  },
  ERC20exit: {
    // We completely liquidate the channel (paying out both parties)
    vanillaNitro: 123510,
  },
  ETHexitSad: {
    // Scenario: Counterparty Bob goes offline
    // initially                 ⬛ ->  X  -> 👩
    // challenge + timeout       ⬛ -> (X) -> 👩
    // transferAllAssets         ⬛ --------> 👩
    vanillaNitro: {
      challenge: 94673,
      transferAllAssets: 109517,
      total: 204190,
    },
  },
  ETHexitSadLedgerFunded: {
    // Scenario: Counterparty Bob goes offline
    vanillaNitro: {
      // initially                   ⬛ ->  L  ->  X  -> 👩
      // challenge X, L and timeout  ⬛ -> (L) -> (X) -> 👩
      // transferAllAssetsL          ⬛ --------> (X) -> 👩
      // transferAllAssetsX          ⬛ ---------------> 👩
      challengeX: 94673,
      challengeL: 91703,
      transferAllAssetsL: 58742,
      transferAllAssetsX: 109517,
      total: 354635,
    },
  },
  ETHexitSadVirtualFunded: {
    // Scenario: Intermediary Ingrid goes offline
    vanillaNitro: {
      // initially                   ⬛ ->  L  ->  J  ->  X  -> 👩
      // challenge L,J,X + timeout   ⬛ -> (L) -> (J) -> (X) -> 👩
      // claimL                      ⬛ ---------------> (X) -> 👩
      // transferAllAssetsX          ⬛ ----------------------> 👩
      challengeL: 94968,
      challengeJ: 103014,
      challengeX: 94673,
      claimL: 107224,
      transferAllAssetsX: 55606,
      total: 455485,
    },
  },
};
