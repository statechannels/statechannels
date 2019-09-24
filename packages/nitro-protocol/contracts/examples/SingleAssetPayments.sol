pragma solidity ^0.5.11;
pragma experimental ABIEncoderV2;

import '../ForceMove/ForceMoveApp.sol';
import '../Outcome.sol';

contract SingleAssetPayments is ForceMoveApp {

    function validTransition(
        VariablePart memory a,
        VariablePart memory b,
        uint256 turnNumB,
        uint256 nParticipants
    ) public pure returns (bool) {

        Outcome.OutcomeItem[] memory outcomeA = abi.decode(a.outcome, (Outcome.OutcomeItem[]));
        Outcome.OutcomeItem[] memory outcomeB = abi.decode(b.outcome, (Outcome.OutcomeItem[]));

        // Throws if more than one asset
        require(outcomeA.length == 1, 'SingleAssetPayments: outcomeA: Only one asset allowed');
        require(outcomeB.length == 1, 'SingleAssetPayments: outcomeB: Only one asset allowed');

        // Throws unless the assetoutcome is an allocation
        Outcome.AssetOutcome memory assetOutcomeA = abi.decode(outcomeA[0].assetOutcomeBytes, (Outcome.AssetOutcome));
        Outcome.AssetOutcome memory assetOutcomeB = abi.decode(outcomeB[0].assetOutcomeBytes, (Outcome.AssetOutcome));
        require(assetOutcomeA.assetOutcomeType == uint8(Outcome.AssetOutcomeType.Allocation),'SingleAssetPayments: outcomeA: AssetOutcomeType must be Allocation');
        require(assetOutcomeB.assetOutcomeType == uint8(Outcome.AssetOutcomeType.Allocation),'SingleAssetPayments: outcomeB: AssetOutcomeType must be Allocation');

        // Throws unless that allocation has exactly n outcomes
        Outcome.AllocationItem[] memory allocationA = abi.decode(
            assetOutcomeA.allocationOrGuaranteeBytes,
            (Outcome.AllocationItem[])
        );
        Outcome.AllocationItem[] memory allocationB = abi.decode(
            assetOutcomeB.allocationOrGuaranteeBytes,
            (Outcome.AllocationItem[])
        );
        require(allocationA.length == nParticipants,'SingleAssetPayments: outcomeA: Allocation length must equal number of participants');
        require(allocationB.length == nParticipants,'SingleAssetPayments: outcomeB: Allocation length must equal number of participants');

        // Interprets the nth outcome as benefiting participant n
        // checks the destinations have not changed
        // Checks that the sum of assets hasn't changed
        // And that for all non-movers
        // the balance hasn't decreased
        uint256 allocationSumA;
        uint256 allocationSumB;
        for (uint256 i=0; i<nParticipants; i++) {
            require(allocationB[i].destination == allocationA[i].destination,'SingleAssetPayments: Destinations may not change');
            allocationSumA += allocationA[i].amount;
            allocationSumB += allocationB[i].amount;
            if (i != turnNumB % nParticipants) {
                require(allocationB[i].amount >= allocationA[i].amount,'SingleAssetPayments: Nonmovers cannot have their balance decreased');
            }
        }
        require(allocationSumA == allocationSumB,'SingleAssetPayments: Total amount allocated cannot change');

        return true;
    }
}
