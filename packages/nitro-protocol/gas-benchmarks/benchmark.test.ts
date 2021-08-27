import {MAGIC_ADDRESS_INDICATING_ETH} from '../src/transactions';

import {
  waitForChallengesToTimeOut,
  challengeChannelAndExpectGas,
  Y,
  X,
  LforX,
  LforJ,
  J,
  assertEthBalancesAndHoldings,
  amountForAlice,
  amountForBob,
  amountForAliceAndBob,
} from './fixtures';
import {gasRequiredTo} from './gas';
import {nitroAdjudicator, token} from './vanillaSetup';

/**
 * Ensures the asset holding contract always has a nonzero token balance.
 */
async function addResidualTokenBalance(asset: string) {
  /**
   * Funding someOtherChannel with tokens, as well as the channel in question
   * makes the benchmark more realistic. In practice many other
   * channels are funded by the nitro adjudicator. If we didn't reflect
   * that, our benchmark might reflect a gas refund for clearing storage
   * in the token contract (setting the token balance of the asset holder to 0)
   * which we would only expect in rare cases.
   */
  await (await nitroAdjudicator.deposit(asset, Y.channelId, 0, 1)).wait();
}

describe('Consumes the expected gas for deployments', () => {
  it(`when deploying the NitroAdjudicator`, async () => {
    await expect(await nitroAdjudicator.deployTransaction).toConsumeGas(
      gasRequiredTo.deployInfrastructureContracts.vanillaNitro.NitroAdjudicator
    );
  });
});
describe('Consumes the expected gas for deposits', () => {
  it(`when directly funding a channel with ETH (first deposit)`, async () => {
    await expect(
      await nitroAdjudicator.deposit(MAGIC_ADDRESS_INDICATING_ETH, X.channelId, 0, 5, {value: 5})
    ).toConsumeGas(gasRequiredTo.directlyFundAChannelWithETHFirst.vanillaNitro);
  });

  it(`when directly funding a channel with ETH (second deposit)`, async () => {
    // begin setup
    const setupTX = nitroAdjudicator.deposit(MAGIC_ADDRESS_INDICATING_ETH, X.channelId, 0, 5, {
      value: 5,
    });
    await (await setupTX).wait();
    // end setup
    await expect(
      await nitroAdjudicator.deposit(MAGIC_ADDRESS_INDICATING_ETH, X.channelId, 5, 5, {value: 5})
    ).toConsumeGas(gasRequiredTo.directlyFundAChannelWithETHSecond.vanillaNitro);
  });

  it(`when directly funding a channel with an ERC20 (first deposit)`, async () => {
    // begin setup
    await (await token.transfer(nitroAdjudicator.address, 1)).wait(); // The asset holder already has some tokens (for other channels)
    // end setup
    await expect(await token.increaseAllowance(nitroAdjudicator.address, 100)).toConsumeGas(
      gasRequiredTo.directlyFundAChannelWithERC20First.vanillaNitro.approve
    );
    await expect(await nitroAdjudicator.deposit(token.address, X.channelId, 0, 5)).toConsumeGas(
      gasRequiredTo.directlyFundAChannelWithERC20First.vanillaNitro.deposit
    );
  });

  it(`when directly funding a channel with an ERC20 (second deposit)`, async () => {
    // begin setup
    await (await token.increaseAllowance(nitroAdjudicator.address, 100)).wait();
    await (await nitroAdjudicator.deposit(token.address, X.channelId, 0, 5)).wait(); // The asset holder already has some tokens *for this channel*
    await (await token.decreaseAllowance(nitroAdjudicator.address, 95)).wait(); // reset allowance to zero
    // end setup
    await expect(await token.increaseAllowance(nitroAdjudicator.address, 100)).toConsumeGas(
      gasRequiredTo.directlyFundAChannelWithERC20Second.vanillaNitro.approve
    );
    await expect(await nitroAdjudicator.deposit(token.address, X.channelId, 5, 5)).toConsumeGas(
      gasRequiredTo.directlyFundAChannelWithERC20Second.vanillaNitro.deposit
    );
  });
});
describe('Consumes the expected gas for happy-path exits', () => {
  it(`when exiting a directly funded (with ETH) channel`, async () => {
    // begin setup
    await (
      await nitroAdjudicator.deposit(MAGIC_ADDRESS_INDICATING_ETH, X.channelId, 0, 10, {value: 10})
    ).wait();
    // end setup
    await expect(await X.concludeAndTransferAllAssetsTx(MAGIC_ADDRESS_INDICATING_ETH)).toConsumeGas(
      gasRequiredTo.ETHexit.vanillaNitro
    );
  });

  it(`when exiting a directly funded (with ERC20s) channel`, async () => {
    // begin setup
    await (await token.increaseAllowance(nitroAdjudicator.address, 100)).wait();
    await (await nitroAdjudicator.deposit(token.address, X.channelId, 0, 10)).wait();
    await addResidualTokenBalance(token.address);
    // end setup
    await expect(await X.concludeAndTransferAllAssetsTx(token.address)).toConsumeGas(
      gasRequiredTo.ERC20exit.vanillaNitro
    );
  });
});

describe('Consumes the expected gas for sad-path exits', () => {
  it(`when exiting a directly funded (with ETH) channel`, async () => {
    // begin setup
    await (
      await nitroAdjudicator.deposit(MAGIC_ADDRESS_INDICATING_ETH, X.channelId, 0, 10, {value: 10})
    ).wait();
    // end setup
    // initially                 ⬛ ->  X  -> 👩
    const {proof, finalizesAt} = await challengeChannelAndExpectGas(
      X,
      MAGIC_ADDRESS_INDICATING_ETH,
      gasRequiredTo.ETHexitSad.vanillaNitro.challenge
    );
    // begin wait
    await waitForChallengesToTimeOut([finalizesAt]);
    // end wait
    // challenge + timeout       ⬛ -> (X) -> 👩
    await expect(
      await nitroAdjudicator.transferAllAssets(
        X.channelId,
        proof.outcomeBytes, // outcomeBytes,
        proof.stateHash // stateHash
      )
    ).toConsumeGas(gasRequiredTo.ETHexitSad.vanillaNitro.transferAllAssets);
    // transferAllAssets ⬛ --------> 👩
    expect(
      gasRequiredTo.ETHexitSad.vanillaNitro.challenge +
        gasRequiredTo.ETHexitSad.vanillaNitro.transferAllAssets
    ).toEqual(gasRequiredTo.ETHexitSad.vanillaNitro.total);
  });

  it(`when exiting a ledger funded (with ETH) channel`, async () => {
    // begin setup
    await (
      await nitroAdjudicator.deposit(MAGIC_ADDRESS_INDICATING_ETH, LforX.channelId, 0, 10, {
        value: 10,
      })
    ).wait();
    // end setup
    // initially                   ⬛ ->  L  ->  X  -> 👩
    const {proof: ledgerProof, finalizesAt: ledgerFinalizesAt} = await challengeChannelAndExpectGas(
      LforX,
      MAGIC_ADDRESS_INDICATING_ETH,
      gasRequiredTo.ETHexitSadLedgerFunded.vanillaNitro.challengeL
    );
    const {proof, finalizesAt} = await challengeChannelAndExpectGas(
      X,
      MAGIC_ADDRESS_INDICATING_ETH,
      gasRequiredTo.ETHexitSadLedgerFunded.vanillaNitro.challengeX
    );
    // begin wait
    await waitForChallengesToTimeOut([ledgerFinalizesAt, finalizesAt]); // just go to the max one
    // end wait
    // challenge X, L and timeout  ⬛ -> (L) -> (X) -> 👩
    await expect(
      await nitroAdjudicator.transferAllAssets(
        LforX.channelId,
        ledgerProof.outcomeBytes, // outcomeBytes
        ledgerProof.stateHash // stateHash
      )
    ).toConsumeGas(gasRequiredTo.ETHexitSadLedgerFunded.vanillaNitro.transferAllAssetsL);
    // transferAllAssetsL  ⬛ --------> (X) -> 👩
    await expect(
      await nitroAdjudicator.transferAllAssets(
        X.channelId,
        proof.outcomeBytes, // outcomeBytes
        proof.stateHash // stateHash
      )
    ).toConsumeGas(gasRequiredTo.ETHexitSadLedgerFunded.vanillaNitro.transferAllAssetsX);
    // transferAllAssetsX  ⬛ ---------------> 👩

    // meta-test here to confirm the total recorded in gas.ts is up to date
    // with the recorded costs of each step
    expect(
      gasRequiredTo.ETHexitSadLedgerFunded.vanillaNitro.challengeL +
        gasRequiredTo.ETHexitSadLedgerFunded.vanillaNitro.transferAllAssetsL +
        gasRequiredTo.ETHexitSadLedgerFunded.vanillaNitro.challengeX +
        gasRequiredTo.ETHexitSadLedgerFunded.vanillaNitro.transferAllAssetsX
    ).toEqual(gasRequiredTo.ETHexitSadLedgerFunded.vanillaNitro.total);
  });

  it(`when exiting a virtual funded (with ETH) channel`, async () => {
    // begin setup
    await (
      await nitroAdjudicator.deposit(MAGIC_ADDRESS_INDICATING_ETH, LforJ.channelId, 0, 10, {
        value: 10,
      })
    ).wait();
    // end setup
    // initially                   ⬛ ->  L  ->  J  ->  X  -> 👩
    // challenge L
    const {proof: ledgerProof, finalizesAt: ledgerFinalizesAt} = await challengeChannelAndExpectGas(
      LforJ,
      MAGIC_ADDRESS_INDICATING_ETH,
      gasRequiredTo.ETHexitSadVirtualFunded.vanillaNitro.challengeL
    );
    // challenge J
    const {
      proof: jointProof,
      finalizesAt: jointChannelFinalizesAt,
    } = await challengeChannelAndExpectGas(
      J,
      MAGIC_ADDRESS_INDICATING_ETH,
      gasRequiredTo.ETHexitSadVirtualFunded.vanillaNitro.challengeJ
    );
    // challenge X
    const {proof, finalizesAt} = await challengeChannelAndExpectGas(
      X,
      MAGIC_ADDRESS_INDICATING_ETH,
      gasRequiredTo.ETHexitSadVirtualFunded.vanillaNitro.challengeX
    );
    // begin wait
    await waitForChallengesToTimeOut([ledgerFinalizesAt, jointChannelFinalizesAt, finalizesAt]);
    // end wait
    // challenge L,J,X + timeout   ⬛ -> (L) -> (J) -> (X) -> 👩
    await assertEthBalancesAndHoldings(
      {Alice: 0, Bob: 0, Ingrid: 0},
      {LforJ: amountForAliceAndBob, J: 0, X: 0}
    );
    await expect(
      await nitroAdjudicator.claim({
        sourceChannelId: LforJ.channelId,
        sourceStateHash: ledgerProof.stateHash,
        sourceOutcomeBytes: ledgerProof.outcomeBytes,
        sourceAssetIndex: 0,
        indexOfTargetInSource: 0,
        targetStateHash: jointProof.stateHash,
        targetOutcomeBytes: jointProof.outcomeBytes,
        targetAssetIndex: 0,
        targetAllocationIndicesToPayout: [], // meaning "all"
      })
    ).toConsumeGas(gasRequiredTo.ETHexitSadVirtualFunded.vanillaNitro.claimL);
    // claimL                      ⬛ ---------------> (X) -> 👩
    await assertEthBalancesAndHoldings(
      {Alice: 0, Bob: 0, Ingrid: 0},
      {LforJ: 0, J: 0, X: amountForAliceAndBob}
    );
    await expect(
      await nitroAdjudicator.transferAllAssets(
        X.channelId,
        proof.outcomeBytes, // outcomeBytes
        proof.stateHash // stateHash
      )
    ).toConsumeGas(gasRequiredTo.ETHexitSadVirtualFunded.vanillaNitro.transferAllAssetsX);
    // transferAllAssetsX          ⬛ ----------------------> 👩
    await assertEthBalancesAndHoldings(
      {Alice: amountForAlice, Bob: amountForBob, Ingrid: 0},
      {LforJ: 0, J: 0, X: 0}
    );

    // meta-test here to confirm the total recorded in gas.ts is up to date
    // with the recorded costs of each step
    expect(
      (Object.values(gasRequiredTo.ETHexitSadVirtualFunded.vanillaNitro) as number[]).reduce(
        (a, b) => a + b
      ) - gasRequiredTo.ETHexitSadVirtualFunded.vanillaNitro.total
    ).toEqual(gasRequiredTo.ETHexitSadVirtualFunded.vanillaNitro.total);
  });
});
