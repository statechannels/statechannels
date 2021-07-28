// SPDX-License-Identifier: MIT
pragma solidity 0.7.4;
pragma experimental ABIEncoderV2;

import '../interfaces/IForceMoveApp.sol';
import {ExitFormat as Outcome} from '@statechannels/exit-format/contracts/ExitFormat.sol';
import '../interfaces/IForceMove.sol';

/**
 * @dev This is a proposed new interface, which delegates turn-taking or other signature semantics to validTransition though the inclusion of a pair of signedBy fields.
 */
interface IForceMoveApp2 {
    struct VariablePart {
        bytes outcome;
        bytes appData;
    }

    /**
     * @notice Encodes application-specific rules for a particular ForceMove-compliant state channel.
     * @dev Encodes application-specific rules for a particular ForceMove-compliant state channel.
     * @param a State being transitioned from.
     * @param b State being transitioned to.
     * @param turnNumB Turn number being transitioned to.
     * @param nParticipants Number of participants in this state channel.
     * @param signedByFrom Bit field showing which participants signed state a.
     * @param signedByTo Bit field showing which participants signed state b.
     * @return true if the transition conforms to this application's rules, false otherwise
     */
    function validTransition(
        VariablePart calldata a,
        VariablePart calldata b,
        uint48 turnNumB,
        uint256 nParticipants,
        uint256 signedByFrom, // Who has signed the "from" state?
        uint256 signedByTo // Who has signed the "to" state?
    ) external pure returns (bool);

    // signedBy
    // 0b000 = 0 : No-one
    // 0b001 = 1 : participant 0
    // 0b010 = 2 : participant 1
    // 0b011 = 3 : participant 0 and participant 1
    // 0b100 = 4 : participant 2
    // 0b101 = 5 : participant 0 and participant 2
    // 0b110 = 6 : participant 1 and participant 2
    // 0b111 = 7 : everyone
}

library ForceMoveAppUtilities {
    function isSignedBy(uint256 signedBy, uint8 participantIndex) internal pure returns (bool) {
        return ((signedBy >> participantIndex) % 2 == 1);
    }

    // This function can be used inside validTransition
    // To recover the legacy "turn taking" semantics
    function isRoundRobin(
        uint256 nParticipants,
        uint48 turnNumB,
        uint256 signedByFrom,
        uint256 signedByTo
    ) internal pure returns (bool) {
        require(
            turnNumB > 0 &&
                isSignedBy(signedByFrom, uint8((turnNumB - 1) % nParticipants)) &&
                isSignedBy(signedByTo, uint8(turnNumB % nParticipants)),
            'roundRobin violation'
        );
        return true;
    }

    /**
     * @notice Given a digest and ethereum digital signature, recover the signer
     * @dev Given a digest and digital signature, recover the signer
     * @param _d message digest
     * @param sig ethereum digital signature
     * @return signer
     */
    function _recoverSigner(bytes32 _d, IForceMove.Signature memory sig)
        internal
        pure
        returns (address)
    {
        bytes32 prefixedHash = keccak256(abi.encodePacked('\x19Ethereum Signed Message:\n32', _d));
        address a = ecrecover(prefixedHash, sig.v, sig.r, sig.s);
        require(a != address(0), 'Invalid signature');
        return (a);
    }
}

// NOTE: This contract should be treated as prototype code. It has not been carefully scrutinized from a security point of view.
// The EmbeddedApplication allows a 2-party subchannel X to be *embedded* in the current 3-party channel J.
// This is in contrast to having the application channel X being *funded* by the current channel J.
// J references X in its AppData. Each state for J contains a support proof for X. Initially, this can be the PreFundSetup of X.
// When there is a supported state (triply signed) in J containing a support proof for X, we say that X has been *embedded* in J.
// Participant 0 (Alice) and Participant 1 (Bob) can run X off-chain in the usual fashion.
// If the three parties agree, they can *un-embed* X from J off-chain by reverting J to a null app and updating the outcome accordingly.
// Any participant can challenge with the latest triply signed state. Then, Alice and Bob get exactly 1 chance each to progress J on chain.
// To progress J on chain, a support proof for X must be provided. Inferior support proofs are rejected. Participant 2 (Irene)'s balance is protected.
// Irene retains the unilateral right to close J -- Alice and Bob each get only 1 chance to update J before Irene's signature is required again.

// How to do virtual funding with an EmbeddedApplication
// ---
// Off chain setup (substeps with a letter may be executed in any order):
//
// 0. Assume (as usual) that A,I and B,I have funded ledger channels already.
// 1. A, B, I sign prefund for J that allocates to {A, B, I}
// 2a. A and I sign a guarantee $G_{AI}$ targeting J with priority {A, I}
// 2b. B and I sign a guarantee $G_{BI}$ targeting J with priority {B, I}
// 3. A, B, I sign postfund for J that allocates to {A, B, I} and embeds X.

// Off chain teardown:
//
// 1. A, B, I triple sign a None update to J that absorbs the latest outcome of X and unembeds X.
// 2a. A and I remove $G_{AI}$ and absorb the outcome of J into their ledger channel
// 2b. B and I remove $G_{BI}$ and absorb the outcome of J into their ledger channel

// On chain challenge path:
//
// 1. J outcome recorded on chain. Each A and B can unilaterally progress the channel once.
// (So the the latency of finalizing a channel on chain is at most 6 timeout periods. In practice, since I never needs to update the channel, the latency is likely 3 timeout periods.)
// 2. Claim with $G_{AI}$ is called.
// 3. Claim with $G_{BI}$ is called. After this, all participants have pulled out their funds.

/**
 * @dev The EmbeddedApplication contract embeds a subchannel X.
 */
contract EmbeddedApplication is
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
    enum AlreadyMoved {None, A, B, AB}

    // Application Data for J
    struct AppData {
        bytes32 channelIdForX;
        SupportProof supportProofForX;
        AlreadyMoved alreadyMoved;
    }

    uint256 internal constant AIndex = 0;
    uint256 internal constant BIndex = 1;
    uint256 internal constant IIndex = 2;

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
        Outcome.Allocation[] memory fromAllocations = decode3PartyAllocation(from.outcome);
        Outcome.Allocation[] memory toAllocations = decode3PartyAllocation(to.outcome);

        require(
            fromAllocations[AIndex].destination == toAllocations[AIndex].destination &&
                fromAllocations[BIndex].destination == toAllocations[BIndex].destination &&
                fromAllocations[IIndex].destination == toAllocations[IIndex].destination,
            'destinations may not change'
        );

        require(fromAllocations[IIndex].amount == toAllocations[IIndex].amount, 'p2.amt !constant');
        require(
            fromAllocations[AIndex].amount +
                fromAllocations[BIndex].amount +
                fromAllocations[IIndex].amount ==
                toAllocations[AIndex].amount +
                    toAllocations[BIndex].amount +
                    toAllocations[IIndex].amount,
            'total allocation changed'
        );

        // Allowed named-state transitions are
        //    AB
        //    ^^
        //   /  \
        // A      B
        // ^      ^
        //  \    /
        //   None

        if (fromAppData.alreadyMoved == AlreadyMoved.None) {
            require(
                (toAppData.alreadyMoved == AlreadyMoved.A && signedByA) ||
                    (toAppData.alreadyMoved == AlreadyMoved.B && signedByB),
                'incorrect move from None'
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
                revert('move from None,A,B only');
            }
        }

        // validate the supplied support proof
        // extract the allocation
        Outcome.Allocation[] memory Xallocations = validateSupportProofForX(fromAppData, toAppData);

        // ensure A,B part of the outcome of X has been absorbed into the outcome of J
        require(
            Xallocations[AIndex].amount == toAllocations[AIndex].amount &&
                Xallocations[BIndex].amount == toAllocations[BIndex].amount &&
                Xallocations[AIndex].destination == toAllocations[AIndex].destination &&
                Xallocations[BIndex].destination == toAllocations[BIndex].destination,
            'X / J outcome mismatch'
        );
        return true;
    }

    function validateSupportProofForX(AppData memory fromAppData, AppData memory toAppData)
        internal
        pure
        returns (Outcome.Allocation[] memory Xallocations)
    {
        // The following checks follow the protocol-level validTransition function
        // They are the members of FixedPart that do not affect the channelId
        require(
            fromAppData.supportProofForX.fixedPart.appDefinition ==
                toAppData.supportProofForX.fixedPart.appDefinition,
            'X.appDefinition changed'
        );
        require(
            fromAppData.supportProofForX.fixedPart.challengeDuration ==
                toAppData.supportProofForX.fixedPart.challengeDuration,
            'X.challengeDuration changed'
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

        bytes32 appPartHash = keccak256(
            abi.encode(
                toAppData.supportProofForX.fixedPart.challengeDuration,
                toAppData.supportProofForX.fixedPart.appDefinition,
                toAppData.supportProofForX.variableParts[0].appData
            )
        );

        // hash the greatest state first (either the later of a pair, or the only state provided)

        uint256 finalIndex = toAppData.supportProofForX.variableParts.length - 1;

        bytes memory greaterStateOutcome = toAppData.supportProofForX.variableParts[finalIndex]
            .outcome;

        bytes32 greaterStateHash = keccak256(
            abi.encode(
                IForceMove.State(
                    toAppData.supportProofForX.turnNumTo,
                    false, // Assume isFinal is false
                    toAppData.channelIdForX,
                    appPartHash,
                    keccak256(greaterStateOutcome)
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
                'sig1 !by participant1'
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
        returns (Outcome.Allocation[] memory allocations)
    {
        Outcome.SingleAssetExit[] memory outcome = Outcome.decodeExit(outcomeBytes);

        // Throws if more than one asset
        require(outcome.length == 1, 'outcome: Exactly 1 asset allowed');

        Outcome.SingleAssetExit memory assetOutcome = outcome[0];

        allocations = assetOutcome.allocations; // TODO should we check each allocation is a "simple" one?

        // Throws unless there are exactly 3 allocations
        require(allocations.length == 3, 'allocation.length != 3');
    }

    function decode2PartyAllocation(bytes memory outcomeBytes)
        private
        pure
        returns (Outcome.Allocation[] memory allocations)
    {
        Outcome.SingleAssetExit[] memory outcome = Outcome.decodeExit(outcomeBytes);

        Outcome.SingleAssetExit memory assetOutcome = outcome[0];

        allocations = assetOutcome.allocations; // TODO should we check each allocation is a "simple" one?

        // Throws unless there are exactly 3 allocations
        require(allocations.length == 2, 'allocation.length != 3');
    }
}
