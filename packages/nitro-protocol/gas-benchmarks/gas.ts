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
      NitroAdjudicator: 2416171, // Singleton
      ETHAssetHolder: 1636603, // Singleton (could be more in principle)
      ERC20AssetHolder: 1659990, // Per Token (could be more in principle)
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
    vanillaNitro: 156969,
  },
  ERC20exit: {
    // We completely liquidate the channel (paying out both parties)
    vanillaNitro: 149324,
  },
  ETHexitSad: {
    // Scenario: Counterparty Bob goes offline
    // initially                 ⬛ ->  X  -> 👩
    // challenge + timeout       ⬛ -> (X) -> 👩
    // pushOutcomeAndTransferAll ⬛ --------> 👩
    vanillaNitro: {
      challenge: 93390,
      pushOutcomeAndTransferAll: 117933,
      total: 211323,
    },
  },
  ETHexitSadLedgerFunded: {
    // Scenario: Counterparty Bob goes offline
    vanillaNitro: {
      // initially                   ⬛ ->  L  ->  X  -> 👩
      // challenge X, L and timeout  ⬛ -> (L) -> (X) -> 👩
      // pushOutcomeAndTransferAllL  ⬛ --------> (X) -> 👩
      // pushOutcomeAndTransferAllX  ⬛ ---------------> 👩
      challengeX: 93390,
      challengeL: 92324,
      pushOutcomeAndTransferAllL: 68831,
      pushOutcomeAndTransferAllX: 117933,
      total: 372478,
    },
  },
  ETHexitSadVirtualFunded: {
    // Scenario: Intermediary Ingrid goes offline
    vanillaNitro: {
      // initially                   ⬛ ->  L  ->  G  ->  J  ->  X  -> 👩
      // challenge L,G,J,X + timeout ⬛ -> (L) -> (G) -> (J) -> (X) -> 👩
      // pushOutcomeAndTransferAllL  ⬛ --------> (G) -> (J) -> (X) -> 👩
      // pushOutcomeG                ⬛ --------> (G) -> (J) -> (X) -> 👩
      // pushOutcomeJ                ⬛ --------> (G) -> (J) -> (X) -> 👩
      // claimG                      ⬛ ----------------------> (X) -> 👩
      // pushOutcomeAndTransferAllX  ⬛ -----------------------------> 👩
      challengeL: 92336,
      challengeG: 94607,
      challengeJ: 101741,
      challengeX: 93390,
      pushOutcomeAndTransferAllL: 68843,
      pushOutcomeG: 61410,
      pushOutcomeJ: 60558,
      claimG: 68692,
      pushOutcomeAndTransferAllX: 117933,
      total: 759510,
    },
  },
};
