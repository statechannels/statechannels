// SPDX-License-Identifier: MIT
pragma solidity 0.7.4;
pragma experimental ABIEncoderV2;

import '../interfaces/IForceMoveApp.sol';
import '../Outcome.sol';
import '../interfaces/IForceMove.sol';

// The EmbeddedApplication allows a 2-party subchannel X to be *embedded* in the current 3-party channel J.
// This is in contract to having the application channel X being *funded* by the current channel J.
// J references X in its AppData. Each state for J contains a support proof for X. Initially, this can be the PreFundSetup of X.
// When there is a supported state (triply signed) in J containing a support proof for X, we say that X has been *embedded* in J.
// Participant 0 (Alice) and Participant 1 (Bob) can run X off-chain in the usual fashion.
// If the three parties agree, they can *un-embed* X from J off-chain by reverting J to a null app and updating the outcome accordingly.
// Any participant can challenge with the latest triply signed state. Then, Alice and Bob get exactly 1 chance each to progress J on chain.
// To progress J on chain, a support proof for X must be provided. Inferior support proofs are rejected. Participant 2 (Irene)'s balance is protected.
// Irene retains the unilateral right to close the channel -- Alice and Bob get only 1 chance to update it each before Irene's signature is required.

/**
 * @dev The XinJ contract embeds a subchannel.
 */
contract XinJ is
    IForceMoveApp2 // We need a new interface to allow signedBy information into the validTransition function
{
    // 2-party SupportProof
    struct SupportProof {
        IForceMove.FixedPart fixedPart;
        VariablePart[] variableParts; // either one or two states
        uint48 turnNumTo;
        IForceMove.Signature[2] sigs; // one for each participant
        uint8[2] whoSignedWhat; // whoSignedWhat = [0,0] or [0,1] or [1,0]
    }

    // Finite states for J
    enum AlreadyMoved {A, B, AB, ABC}

    // Applicatoin Data for J
    struct AppData {
        bytes32 channelIdForX;
        SupportProof supportProofForX;
        AlreadyMoved alreadyMoved;
    }

    function validTransition(
        VariablePart memory from,
        VariablePart memory to,
        uint48, // turnNumTo (unused)
        uint256, // nParticipants (unused)
        uint256, // signedByFrom (unused) - Who has signed the "from" state?
        uint256 signedByTo // Who has signed the "to" state?
    ) public override pure returns (bool) {
        // parameter wrangling
        bool signedByA = ForceMoveAppUtilities.isSignedBy(signedByTo, 0);
        bool signedByB = ForceMoveAppUtilities.isSignedBy(signedByTo, 1);
        AppData memory fromAppData = abi.decode(from.appData, (AppData));
        AppData memory toAppData = abi.decode(to.appData, (AppData));
        Outcome.AllocationItem[] memory fromAllocation = decode3PartyAllocation(from.outcome);
        Outcome.AllocationItem[] memory toAllocation = decode3PartyAllocation(to.outcome);

        require(
            fromAllocation[0].destination == toAllocation[0].destination &&
                fromAllocation[1].destination == toAllocation[1].destination &&
                fromAllocation[2].destination == toAllocation[2].destination,
            'destinations may not change'
        );

        require(fromAllocation[2].amount == toAllocation[2].amount, 'p2.amt constant');

        // Allowed named-state transitions are
        //    AB
        //    ^^
        //   /  \
        // A      B
        // ^      ^
        //  \    /
        //    ABC

        if (fromAppData.alreadyMoved == AlreadyMoved.ABC) {
            require(
                (toAppData.alreadyMoved == AlreadyMoved.A && signedByA) ||
                    (toAppData.alreadyMoved == AlreadyMoved.B && signedByB),
                'incorrect move from ABC'
            );
        } else {
            // If a support proof has already been supplied, the current support proof must be greater
            require(
                toAppData.supportProofForX.turnNumTo > fromAppData.supportProofForX.turnNumTo,
                'inferior support proof'
            );
            if (fromAppData.alreadyMoved == AlreadyMoved.A) {
                require(
                    toAppData.alreadyMoved == AlreadyMoved.AB && signedByB,
                    'incorrect move from A'
                );
            } else if (fromAppData.alreadyMoved == AlreadyMoved.B) {
                require(
                    toAppData.alreadyMoved == AlreadyMoved.AB && signedByA,
                    'incorrect move from B'
                );
            } else {
                revert('move from ABC,A,B only');
            }
        }

        // validate the supplied support proof
        // extract the allocation
        Outcome.AllocationItem[] memory Xallocation = validateSupportProofForX(
            fromAppData,
            toAppData
        );

        // ensure A,B part of the outcome of X has been absorbed into the outcome of J
        require(
            Xallocation[0].amount == toAllocation[0].amount &&
                Xallocation[1].amount == toAllocation[1].amount &&
                Xallocation[0].destination == toAllocation[0].destination &&
                Xallocation[1].destination == toAllocation[1].destination,
            'X / J outcome mismatch'
        );
        return true;
    }

    function validateSupportProofForX(AppData memory fromAppData, AppData memory toAppData)
        internal
        pure
        returns (Outcome.AllocationItem[] memory Xallocation)
    {
        // The following checks follow the protocol-level validTransition function
        // They are the members of FixedPart that do not affect the channelId
        require(
            fromAppData.supportProofForX.fixedPart.appDefinition ==
                toAppData.supportProofForX.fixedPart.appDefinition,
            'appDefinition changed'
        );
        require(
            fromAppData.supportProofForX.fixedPart.challengeDuration ==
                toAppData.supportProofForX.fixedPart.challengeDuration,
            'challengeDuration changed'
        ); // this is actually never used so could be 0

        // A support proof requires 2 signatures
        // But it may have either 1 or two states.
        // If both signatures on the same state, it is supported
        // Else one signature per state and we must check for a valid transition
        require(
            toAppData.supportProofForX.variableParts.length == 1 ||
                toAppData.supportProofForX.variableParts.length == 2,
            '1 or 2 states required'
        );
        require(
            toAppData.supportProofForX.whoSignedWhat.length == 2,
            'whoSignedWhat.length must be 2'
        );

        bytes32 appPartHash = keccak256(
            abi.encode(
                toAppData.supportProofForX.fixedPart.challengeDuration,
                toAppData.supportProofForX.fixedPart.appDefinition,
                toAppData.supportProofForX.variableParts[0].appData
            )
        );

        // hash the greatest state first (either the later of a pair, or the only state provided)
        bytes32 greaterStateHash = keccak256(
            abi.encode(
                IForceMove.State(
                    toAppData.supportProofForX.turnNumTo,
                    false, // Assume isFinal is false
                    toAppData.channelIdForX,
                    appPartHash,
                    keccak256(
                        toAppData.supportProofForX.variableParts[toAppData
                            .supportProofForX
                            .variableParts
                            .length - 1]
                            .outcome
                    )
                )
            )
        );

        if (
            (toAppData.supportProofForX.whoSignedWhat[0] == 0) &&
            (toAppData.supportProofForX.whoSignedWhat[1] == 0)
        ) {
            require(
                (ForceMoveAppUtilities._recoverSigner(
                    greaterStateHash,
                    toAppData.supportProofForX.sigs[0]
                ) == toAppData.supportProofForX.fixedPart.participants[0]),
                'sig0 !by participant0'
            );
            require(
                ForceMoveAppUtilities._recoverSigner(
                    greaterStateHash,
                    toAppData.supportProofForX.sigs[1]
                ) == toAppData.supportProofForX.fixedPart.participants[1],
                'sig1 !by by participant1'
            );
        } else {
            bytes32 lesserStateHash = keccak256(
                abi.encode(
                    IForceMove.State(
                        toAppData.supportProofForX.turnNumTo - 1,
                        false, // Assume isFinal is false
                        toAppData.channelIdForX,
                        appPartHash,
                        keccak256(toAppData.supportProofForX.variableParts[0].outcome)
                    )
                )
            );

            if (
                (toAppData.supportProofForX.whoSignedWhat[0] == 0) &&
                (toAppData.supportProofForX.whoSignedWhat[1] == 1)
            ) {
                require(
                    (ForceMoveAppUtilities._recoverSigner(
                        lesserStateHash,
                        toAppData.supportProofForX.sigs[0]
                    ) == toAppData.supportProofForX.fixedPart.participants[0]),
                    'sig0 on state0 !by participant0'
                );
                require(
                    ForceMoveAppUtilities._recoverSigner(
                        greaterStateHash,
                        toAppData.supportProofForX.sigs[1]
                    ) == toAppData.supportProofForX.fixedPart.participants[1],
                    'sig1 on state1 !by participant1'
                );
            } else if (
                (toAppData.supportProofForX.whoSignedWhat[0] == 1) &&
                (toAppData.supportProofForX.whoSignedWhat[1] == 0)
            ) {
                require(
                    (ForceMoveAppUtilities._recoverSigner(
                        greaterStateHash,
                        toAppData.supportProofForX.sigs[0]
                    ) == toAppData.supportProofForX.fixedPart.participants[0]),
                    'sig0 on state1 !by participant0'
                );
                require(
                    ForceMoveAppUtilities._recoverSigner(
                        lesserStateHash,
                        toAppData.supportProofForX.sigs[1]
                    ) == toAppData.supportProofForX.fixedPart.participants[1],
                    'sig1 on state0 !by participant1'
                );
            } else revert('invalid whoSignedWhat');

            require(
                IForceMoveApp2(toAppData.supportProofForX.fixedPart.appDefinition).validTransition(
                    toAppData.supportProofForX.variableParts[0],
                    toAppData.supportProofForX.variableParts[1],
                    toAppData.supportProofForX.turnNumTo,
                    2, // nParticipants
                    toAppData.supportProofForX.whoSignedWhat[0] == 0 ? 1 : 2, // signedByFrom = 0b01 or 0b10; participant 0 or 1 only. Implied by require statement above.
                    toAppData.supportProofForX.whoSignedWhat[0] == 0 ? 2 : 1 //    signedByTo = 0b10 or 0b01; participant 1 or 0 only. Implied by require statement above.
                ),
                'invalid transition in X'
            );
        }

        return
            decode2PartyAllocation(
                toAppData.supportProofForX.variableParts[toAppData
                    .supportProofForX
                    .variableParts
                    .length - 1]
                    .outcome
            );
    }

    // TODO write a reusable decodeNPartyAllocation fn
    function decode3PartyAllocation(bytes memory outcomeBytes)
        private
        pure
        returns (Outcome.AllocationItem[] memory allocation)
    {
        Outcome.OutcomeItem[] memory outcome = abi.decode(outcomeBytes, (Outcome.OutcomeItem[]));

        // Throws if more than one asset
        require(outcome.length == 1, 'outcome: Exactly 1 asset allowed');

        Outcome.AssetOutcome memory assetOutcome = abi.decode(
            outcome[0].assetOutcomeBytes,
            (Outcome.AssetOutcome)
        );

        // Throws unless the assetoutcome is an allocation
        require(
            assetOutcome.assetOutcomeType == uint8(Outcome.AssetOutcomeType.Allocation),
            'AssetOutcome must be Allocation'
        );

        allocation = abi.decode(
            assetOutcome.allocationOrGuaranteeBytes,
            (Outcome.AllocationItem[])
        );
        // Throws unless there are exactly 3 allocations
        require(allocation.length == 3, 'allocation.length != 3');
    }

    function decode2PartyAllocation(bytes memory outcomeBytes)
        private
        pure
        returns (Outcome.AllocationItem[] memory allocation)
    {
        Outcome.OutcomeItem[] memory outcome = abi.decode(outcomeBytes, (Outcome.OutcomeItem[]));

        // Throws if more than one asset
        require(outcome.length == 1, 'outcome: Only one asset allowed');

        Outcome.AssetOutcome memory assetOutcome = abi.decode(
            outcome[0].assetOutcomeBytes,
            (Outcome.AssetOutcome)
        );

        // Throws unless the assetoutcome is an allocation
        require(
            assetOutcome.assetOutcomeType == uint8(Outcome.AssetOutcomeType.Allocation),
            'AssetOutcome must be Allocation'
        );

        allocation = abi.decode(
            assetOutcome.allocationOrGuaranteeBytes,
            (Outcome.AllocationItem[])
        );

        // Throws unless there are exactly 2 allocations
        require(allocation.length == 2, 'allocation.length != 2');
    }
}
