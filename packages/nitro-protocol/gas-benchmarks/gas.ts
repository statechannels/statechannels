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
      NitroAdjudicator: 3927747, // Singleton
    },
  },
  directlyFundAChannelWithETHFirst: {
    vanillaNitro: 48754,
  },
  directlyFundAChannelWithETHSecond: {
    // meaning the second participant in the channel
    vanillaNitro: 31666,
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
      deposit: 72132,
    },
  },
  directlyFundAChannelWithERC20Second: {
    // meaning the second participant in the channel
    vanillaNitro: {
      approve: 46383,
      // ^^^^^
      // In principle this only needs to be done once per account
      // (the cost may be amortized over several deposits into this AssetHolder)
      deposit: 55044,
    },
  },
  ETHexit: {
    // We completely liquidate the channel (paying out both parties)
    vanillaNitro: 96739,
  },
  ERC20exit: {
    // We completely liquidate the channel (paying out both parties)
    vanillaNitro: 96739,
  },
  ETHexitSad: {
    // Scenario: Counterparty Bob goes offline
    // initially                 ⬛ ->  X  -> 👩
    // challenge + timeout       ⬛ -> (X) -> 👩
    // transferAllAssets         ⬛ --------> 👩
    vanillaNitro: {
      challenge: 93435,
      transferAllAssets: 55640,
      total: 149075,
    },
  },
  ETHexitSadLedgerFunded: {
    // Scenario: Counterparty Bob goes offline
    vanillaNitro: {
      // initially                   ⬛ ->  L  ->  X  -> 👩
      // challenge X, L and timeout  ⬛ -> (L) -> (X) -> 👩
      // transferAllAssetsL          ⬛ --------> (X) -> 👩
      // transferAllAssetsX          ⬛ ---------------> 👩
      challengeX: 93435,
      challengeL: 92393,
      transferAllAssetsL: 52305,
      transferAllAssetsX: 55640,
      total: 293773,
    },
  },
  ETHexitSadVirtualFunded: {
    // Scenario: Intermediary Ingrid goes offline
    vanillaNitro: {
      // initially                   ⬛ ->  L  ->  G  ->  J  ->  X  -> 👩
      // challenge L,G,J,X + timeout ⬛ -> (L) -> (G) -> (J) -> (X) -> 👩
      // transferAllAssetsL          ⬛ --------> (G) -> (J) -> (X) -> 👩
      // claimG                      ⬛ ----------------------> (X) -> 👩
      // transferAllAssetsX          ⬛ -----------------------------> 👩
      challengeL: 92141,
      challengeG: 94400,
      challengeJ: 101511,
      challengeX: 93207,
      transferAllAssetsL: 65198,
      claimG: 80276,
      transferAllAssetsX: 115652,
      total: 642385,
    },
  },
};
