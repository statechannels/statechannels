// SPDX-License-Identifier: MIT
pragma solidity 0.7.4;
pragma experimental ABIEncoderV2;

import '../interfaces/IForceMoveApp.sol';
import {ExitFormat as Outcome} from '@statechannels/exit-format/contracts/ExitFormat.sol';

/**
 * @dev The SingleAssetPayments contract complies with the ForceMoveApp interface and implements a simple payment channel with a single asset type only.
 */
contract SingleAssetPayments is IForceMoveApp {
    /**
     * @notice Encodes the payment channel update rules.
     * @dev Encodes the payment channel update rules.
     * @param a State being transitioned from.
     * @param b State being transitioned to.
     * @param turnNumB Turn number being transitioned to.
     * @param nParticipants Number of participants in this state channel.
     * @return true if the transition conforms to the rules, false otherwise.
     */
    function validTransition(
        VariablePart memory a,
        VariablePart memory b,
        uint48 turnNumB,
        uint256 nParticipants
    ) public override pure returns (bool) {
        Outcome.OutcomeItem[] memory outcomeA = abi.decode(a.outcome, (Outcome.OutcomeItem[]));
        Outcome.OutcomeItem[] memory outcomeB = abi.decode(b.outcome, (Outcome.OutcomeItem[]));

        // Throws if more than one asset
        require(outcomeA.length == 1, 'outcomeA: Only one asset allowed');
        require(outcomeB.length == 1, 'outcomeB: Only one asset allowed');

        // Throws unless the assetoutcome is an allocation
        Outcome.AssetOutcome memory assetOutcomeA = abi.decode(
            outcomeA[0].assetOutcomeBytes,
            (Outcome.AssetOutcome)
        );
        Outcome.AssetOutcome memory assetOutcomeB = abi.decode(
            outcomeB[0].assetOutcomeBytes,
            (Outcome.AssetOutcome)
        );
        require(
            assetOutcomeA.assetOutcomeType == Outcome.AssetOutcomeType.Allocation,
            'AssetOutcomeA must be Allocation'
        );
        require(
            assetOutcomeB.assetOutcomeType == Outcome.AssetOutcomeType.Allocation,
            'AssetOutcomeB must be Allocation'
        );

        // Throws unless that allocation has exactly n outcomes
        Outcome.AllocationItem[] memory allocationA = abi.decode(
            assetOutcomeA.allocationOrGuaranteeBytes,
            (Outcome.AllocationItem[])
        );
        Outcome.AllocationItem[] memory allocationB = abi.decode(
            assetOutcomeB.allocationOrGuaranteeBytes,
            (Outcome.AllocationItem[])
        );
        require(allocationA.length == nParticipants, '|AllocationA|!=|participants|');
        require(allocationB.length == nParticipants, '|AllocationB|!=|participants|');

        // Interprets the nth outcome as benefiting participant n
        // checks the destinations have not changed
        // Checks that the sum of assets hasn't changed
        // And that for all non-movers
        // the balance hasn't decreased
        uint256 allocationSumA;
        uint256 allocationSumB;
        for (uint256 i = 0; i < nParticipants; i++) {
            require(
                allocationB[i].destination == allocationA[i].destination,
                'Destinations may not change'
            );
            allocationSumA += allocationA[i].amount;
            allocationSumB += allocationB[i].amount;
            if (i != turnNumB % nParticipants) {
                require(
                    allocationB[i].amount >= allocationA[i].amount,
                    'Nonmover balance decreased'
                );
            }
        }
        require(allocationSumA == allocationSumB, 'Total allocated cannot change');

        return true;
    }
}
