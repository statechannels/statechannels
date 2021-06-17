import {encodeAllocation, encodeGuarantee} from '../src';

import {
  channelId,
  counterSignedSupportProof,
  finalizationProof,
  finalState,
  ledgerChannelId,
  someOtherChannelId,
  someState,
  waitForChallengesToTimeOut,
  getFinalizesAtFromTransactionHash,
  someLedgerStateFundingX,
  someLedgerStateFundingG,
  someGuarantorState,
  someJointChannelState,
  guarantorChannelId,
  jointChannelId,
  guarantee,
  jointChannelAllocation,
  challengeChannelAndExpectGas,
} from './fixtures';
import {gasRequiredTo} from './gas';
import {erc20AssetHolder, ethAssetHolder, nitroAdjudicator, token} from './vanillaSetup';

/**
 * Ensures the supplied asset holder always has a nonzero token balance.
 */
async function addResidualTokenBalanceToAssetHolder(assetHolder: typeof erc20AssetHolder) {
  /**
   * Funding someOtherChannel with tokens, as well as the channel in question
   * makes the benchmark more realistic. In practice many other
   * channels are funded by this asset holder. If we didn't reflect
   * that, our benchmark might reflect a gas refund for clearing storage
   * in the token contract (setting the token balance of the asset holder to 0)
   * which we would only expect in rare cases.
   */
  await (await assetHolder.deposit(someOtherChannelId, 0, 1)).wait(); // other channels are funded by this asset holder
}

describe('Consumes the expected gas for deployments', () => {
  it(`when deploying the NitroAdjudicator`, async () => {
    await expect(await nitroAdjudicator.deployTransaction).toConsumeGas(
      gasRequiredTo.deployInfrastructureContracts.vanillaNitro.NitroAdjudicator
    );
  });

  it(`when deploying the ETHAssetHolder`, async () => {
    await expect(await ethAssetHolder.deployTransaction).toConsumeGas(
      gasRequiredTo.deployInfrastructureContracts.vanillaNitro.ETHAssetHolder
    );
  });

  it(`when deploying the ERC20AssetHolder`, async () => {
    await expect(await erc20AssetHolder.deployTransaction).toConsumeGas(
      gasRequiredTo.deployInfrastructureContracts.vanillaNitro.ERC20AssetHolder
    );
  });
});
describe('Consumes the expected gas for deposits', () => {
  it(`when directly funding a channel with ETH (first deposit)`, async () => {
    await expect(await ethAssetHolder.deposit(channelId, 0, 5, {value: 5})).toConsumeGas(
      gasRequiredTo.directlyFundAChannelWithETHFirst.vanillaNitro
    );
  });

  it(`when directly funding a channel with ETH (second deposit)`, async () => {
    // begin setup
    const setupTX = ethAssetHolder.deposit(channelId, 0, 5, {value: 5});
    await (await setupTX).wait();
    // end setup
    await expect(await ethAssetHolder.deposit(channelId, 5, 5, {value: 5})).toConsumeGas(
      gasRequiredTo.directlyFundAChannelWithETHSecond.vanillaNitro
    );
  });

  it(`when directly funding a channel with an ERC20 (first deposit)`, async () => {
    // begin setup
    await (await token.transfer(erc20AssetHolder.address, 1)).wait(); // The asset holder already has some tokens (for other channels)
    // end setup
    await expect(await token.increaseAllowance(erc20AssetHolder.address, 100)).toConsumeGas(
      gasRequiredTo.directlyFundAChannelWithERC20First.vanillaNitro.approve
    );
    await expect(await erc20AssetHolder.deposit(channelId, 0, 5)).toConsumeGas(
      gasRequiredTo.directlyFundAChannelWithERC20First.vanillaNitro.deposit
    );
  });

  it(`when directly funding a channel with an ERC20 (second deposit)`, async () => {
    // begin setup
    await (await token.increaseAllowance(erc20AssetHolder.address, 100)).wait();
    await (await erc20AssetHolder.deposit(channelId, 0, 5)).wait(); // The asset holder already has some tokens *for this channel*
    await (await token.decreaseAllowance(erc20AssetHolder.address, 95)).wait(); // reset allowance to zero
    // end setup
    await expect(await token.increaseAllowance(erc20AssetHolder.address, 100)).toConsumeGas(
      gasRequiredTo.directlyFundAChannelWithERC20Second.vanillaNitro.approve
    );
    await expect(await erc20AssetHolder.deposit(channelId, 5, 5)).toConsumeGas(
      gasRequiredTo.directlyFundAChannelWithERC20Second.vanillaNitro.deposit
    );
  });
});
describe('Consumes the expected gas for happy-path exits', () => {
  it(`when exiting a directly funded (with ETH) channel`, async () => {
    // begin setup
    await (await ethAssetHolder.deposit(someOtherChannelId, 0, 10, {value: 10})).wait(); // other channels are funded by this asset holder
    await (await ethAssetHolder.deposit(channelId, 0, 10, {value: 10})).wait();
    // end setup
    const fP = finalizationProof(finalState(ethAssetHolder.address));
    await expect(
      await nitroAdjudicator.concludePushOutcomeAndTransferAll(
        fP.largestTurnNum,
        fP.fixedPart,
        fP.appPartHash,
        fP.outcomeBytes,
        fP.numStates,
        fP.whoSignedWhat,
        fP.sigs
      )
    ).toConsumeGas(gasRequiredTo.ETHexit.vanillaNitro);
  });

  it(`when exiting a directly funded (with ERC20s) channel`, async () => {
    // begin setup
    await (await token.increaseAllowance(erc20AssetHolder.address, 100)).wait();
    await (await erc20AssetHolder.deposit(channelId, 0, 10)).wait();
    await addResidualTokenBalanceToAssetHolder(erc20AssetHolder);

    // end setup
    const fP = finalizationProof(finalState(erc20AssetHolder.address));
    await expect(
      await nitroAdjudicator.concludePushOutcomeAndTransferAll(
        fP.largestTurnNum,
        fP.fixedPart,
        fP.appPartHash,
        fP.outcomeBytes,
        fP.numStates,
        fP.whoSignedWhat,
        fP.sigs
      )
    ).toConsumeGas(gasRequiredTo.ERC20exit.vanillaNitro);
  });
});

describe('Consumes the expected gas for sad-path exits', () => {
  it(`when exiting a directly funded (with ETH) channel`, async () => {
    // begin setup
    await (await ethAssetHolder.deposit(channelId, 0, 10, {value: 10})).wait();
    // end setup
    // initially                 ⬛ ->  X  -> 👩
    const fP = counterSignedSupportProof(someState(ethAssetHolder.address)); // TODO use a nontrivial app with a state transition
    const challengeTx = await nitroAdjudicator.challenge(
      fP.fixedPart,
      fP.largestTurnNum,
      fP.variableParts,
      fP.isFinalCount,
      fP.signatures,
      fP.whoSignedWhat,
      fP.challengeSignature
    );
    await expect(challengeTx).toConsumeGas(gasRequiredTo.ETHexitSad.vanillaNitro.challenge);
    const finalizesAt = await getFinalizesAtFromTransactionHash(challengeTx.hash);
    // begin wait
    await waitForChallengesToTimeOut([finalizesAt]);
    // end wait
    // challenge + timeout       ⬛ -> (X) -> 👩
    await expect(
      await nitroAdjudicator.pushOutcomeAndTransferAll(
        channelId,
        fP.largestTurnNum,
        finalizesAt, // finalizesAt
        fP.stateHash, // stateHash
        fP.challengerAddress, // challengerAddress
        fP.outcomeBytes // outcomeBytes
      )
    ).toConsumeGas(gasRequiredTo.ETHexitSad.vanillaNitro.pushOutcomeAndTransferAll);
    // pushOutcomeAndTransferAll ⬛ --------> 👩
    expect(
      gasRequiredTo.ETHexitSad.vanillaNitro.challenge +
        gasRequiredTo.ETHexitSad.vanillaNitro.pushOutcomeAndTransferAll
    ).toEqual(gasRequiredTo.ETHexitSad.vanillaNitro.total);
  });

  it(`when exiting a ledger funded (with ETH) channel`, async () => {
    // begin setup
    await (await ethAssetHolder.deposit(ledgerChannelId, 0, 10, {value: 10})).wait();
    // end setup
    // initially                   ⬛ ->  L  ->  X  -> 👩
    const {proof: ledgerProof, finalizesAt: ledgerFinalizesAt} = await challengeChannelAndExpectGas(
      someLedgerStateFundingX(ethAssetHolder.address),
      gasRequiredTo.ETHexitSadLedgerFunded.vanillaNitro.challengeL
    );
    const {proof, finalizesAt} = await challengeChannelAndExpectGas(
      someState(ethAssetHolder.address),
      gasRequiredTo.ETHexitSadLedgerFunded.vanillaNitro.challengeX
    );
    // begin wait
    await waitForChallengesToTimeOut([ledgerFinalizesAt, finalizesAt]); // just go to the max one
    // end wait
    // challenge X, L and timeout  ⬛ -> (L) -> (X) -> 👩
    await expect(
      await nitroAdjudicator.pushOutcomeAndTransferAll(
        ledgerChannelId,
        ledgerProof.largestTurnNum,
        ledgerFinalizesAt, // finalizesAt
        ledgerProof.stateHash, // stateHash
        ledgerProof.challengerAddress, // challengerAddress
        ledgerProof.outcomeBytes // outcomeBytes
      )
    ).toConsumeGas(gasRequiredTo.ETHexitSadLedgerFunded.vanillaNitro.pushOutcomeAndTransferAllL);
    // pushOutcomeAndTransferAllL  ⬛ --------> (X) -> 👩
    await expect(
      await nitroAdjudicator.pushOutcomeAndTransferAll(
        channelId,
        proof.largestTurnNum,
        finalizesAt, // finalizesAt
        proof.stateHash, // stateHash
        proof.challengerAddress, // challengerAddress
        proof.outcomeBytes // outcomeBytes
      )
    ).toConsumeGas(gasRequiredTo.ETHexitSadLedgerFunded.vanillaNitro.pushOutcomeAndTransferAllX);
    // pushOutcomeAndTransferAllX  ⬛ ---------------> 👩
    expect(
      gasRequiredTo.ETHexitSadLedgerFunded.vanillaNitro.challengeL +
        gasRequiredTo.ETHexitSadLedgerFunded.vanillaNitro.pushOutcomeAndTransferAllL +
        gasRequiredTo.ETHexitSadLedgerFunded.vanillaNitro.challengeX +
        gasRequiredTo.ETHexitSadLedgerFunded.vanillaNitro.pushOutcomeAndTransferAllX
    ).toEqual(gasRequiredTo.ETHexitSadLedgerFunded.vanillaNitro.total);
  });

  it(`when exiting a virtual funded (with ETH) channel`, async () => {
    // begin setup
    await (await ethAssetHolder.deposit(someOtherChannelId, 0, 10, {value: 10})).wait(); // other channels are funded by this asset holder
    await (await ethAssetHolder.deposit(ledgerChannelId, 0, 10, {value: 10})).wait();
    // end setup
    // initially                   ⬛ ->  L  ->  G  ->  J  ->  X  -> 👩
    // challenge L
    const {proof: ledgerProof, finalizesAt: ledgerFinalizesAt} = await challengeChannelAndExpectGas(
      someLedgerStateFundingG(ethAssetHolder.address),
      gasRequiredTo.ETHexitSadVirtualFunded.vanillaNitro.challengeL
    );
    // challenge G
    const {
      proof: guarantorProof,
      finalizesAt: guarantorFinalizesAt,
    } = await challengeChannelAndExpectGas(
      someGuarantorState(ethAssetHolder.address),
      gasRequiredTo.ETHexitSadVirtualFunded.vanillaNitro.challengeG
    );
    // challenge J
    const {
      proof: jointProof,
      finalizesAt: jointChannelFinalizesAt,
    } = await challengeChannelAndExpectGas(
      someJointChannelState(ethAssetHolder.address),
      gasRequiredTo.ETHexitSadVirtualFunded.vanillaNitro.challengeJ
    );
    // challenge X
    const {proof, finalizesAt} = await challengeChannelAndExpectGas(
      someState(ethAssetHolder.address),
      gasRequiredTo.ETHexitSadVirtualFunded.vanillaNitro.challengeX
    );
    // begin wait
    await waitForChallengesToTimeOut([
      ledgerFinalizesAt,
      guarantorFinalizesAt,
      jointChannelFinalizesAt,
      finalizesAt,
    ]);
    // end wait
    // challenge L,G,J,X + timeout ⬛ -> (L) -> (G) -> (J) -> (X) -> 👩
    await expect(
      await nitroAdjudicator.pushOutcomeAndTransferAll(
        ledgerChannelId,
        ledgerProof.largestTurnNum,
        ledgerFinalizesAt, // finalizesAt
        ledgerProof.stateHash, // stateHash
        ledgerProof.challengerAddress, // challengerAddress
        ledgerProof.outcomeBytes // outcomeBytes
      )
    ).toConsumeGas(gasRequiredTo.ETHexitSadVirtualFunded.vanillaNitro.pushOutcomeAndTransferAllL);
    // pushOutcomeAndTransferAllL  ⬛ --------> (G) -> (J) -> (X) -> 👩
    await expect(
      await nitroAdjudicator.pushOutcome(
        guarantorChannelId,
        guarantorProof.largestTurnNum,
        guarantorFinalizesAt,
        guarantorProof.stateHash,
        guarantorProof.challengerAddress,
        guarantorProof.outcomeBytes
      )
    ).toConsumeGas(gasRequiredTo.ETHexitSadVirtualFunded.vanillaNitro.pushOutcomeG);
    // pushOutcomeG                ⬛ --------> (G) -> (J) -> (X) -> 👩
    await expect(
      await nitroAdjudicator.pushOutcome(
        jointChannelId,
        jointProof.largestTurnNum,
        jointChannelFinalizesAt,
        jointProof.stateHash,
        jointProof.challengerAddress,
        jointProof.outcomeBytes
      )
    ).toConsumeGas(gasRequiredTo.ETHexitSadVirtualFunded.vanillaNitro.pushOutcomeJ);
    // pushOutcomeJ                ⬛ --------> (G) -> (J) -> (X) -> 👩
    await expect(
      await ethAssetHolder.claim(
        guarantorChannelId,
        encodeGuarantee(guarantee),
        encodeAllocation(jointChannelAllocation),
        [] // meaning "all"
      )
    ).toConsumeGas(gasRequiredTo.ETHexitSadVirtualFunded.vanillaNitro.claimG);
    // claimG                      ⬛ ----------------------> (X) -> 👩
    await expect(
      await nitroAdjudicator.pushOutcomeAndTransferAll(
        channelId,
        proof.largestTurnNum,
        finalizesAt, // finalizesAt
        proof.stateHash, // stateHash
        proof.challengerAddress, // challengerAddress
        proof.outcomeBytes // outcomeBytes
      )
    ).toConsumeGas(gasRequiredTo.ETHexitSadVirtualFunded.vanillaNitro.pushOutcomeAndTransferAllX);
    // pushOutcomeAndTransferAllX  ⬛ -----------------------------> 👩
    expect(
      (Object.values(gasRequiredTo.ETHexitSadVirtualFunded.vanillaNitro) as number[]).reduce(
        (a, b) => a + b
      ) - gasRequiredTo.ETHexitSadVirtualFunded.vanillaNitro.total
    ).toEqual(gasRequiredTo.ETHexitSadVirtualFunded.vanillaNitro.total);
  });
});
