pragma solidity ^0.5.0;
pragma experimental ABIEncoderV2;

import "./Commitment.sol";
import "./ForceMoveApp.sol";

library Rules {
    using Commitment for Commitment.CommitmentStruct;
    struct Challenge {
        address channelId;
        Commitment.CommitmentStruct commitment;
        uint32 expirationTime;
        uint256[] payouts;
    }

    function validForceMove(
        Commitment.CommitmentStruct memory _fromCommitment,
        Commitment.CommitmentStruct memory _toCommitment,
        uint8[] memory v, // TODO: replace with Signature
        bytes32[] memory r,
        bytes32[] memory s
    ) public pure returns (bool) {
        // commitments must be signed by the appropriate participant
        _fromCommitment.requireSignature(v[0], r[0], s[0]);
        _toCommitment.requireSignature(v[1], r[1], s[1]);

        return validTransition(_fromCommitment, _toCommitment);
    }

    function validConclusionProof(
        Commitment.CommitmentStruct memory _fromCommitment,
        Commitment.CommitmentStruct memory _toCommitment,
        uint8[] memory v,
        bytes32[] memory r,
        bytes32[] memory s
    ) public pure returns (bool) {
        // commitments must be signed by the appropriate participant
        _fromCommitment.requireSignature(v[0], r[0], s[0]);
        _toCommitment.requireSignature(v[1], r[1], s[1]);

        // first move must be a concluded Commitment (transition rules will ensure this for the other commitments)
        require(
            _fromCommitment.isConclude(),
            "fromCommitment must be Conclude"
        );
        // must be a valid transition
        return validTransition(_fromCommitment, _toCommitment);
    }

    function validRefute(
        Commitment.CommitmentStruct memory _challengeCommitment,
        Commitment.CommitmentStruct memory _refutationCommitment,
        uint8 v,
        bytes32 r,
        bytes32 s
    ) public pure returns (bool) {
        require(
            _refutationCommitment.turnNum > _challengeCommitment.turnNum,
            "the refutationCommitment must have a higher nonce"
        );
        require(
            _refutationCommitment.mover() == _challengeCommitment.mover(),
            "refutationCommitment must have same mover as challengeCommitment"
        );
        // ... and be signed (by that mover)
        _refutationCommitment.requireSignature(v, r, s);

        return true;
    }

    function validRespondWithMove(
        Commitment.CommitmentStruct memory _challengeCommitment,
        Commitment.CommitmentStruct memory _nextCommitment,
        uint8 v,
        bytes32 r,
        bytes32 s
    ) public pure returns (bool) {
        // check that the challengee's signature matches
        _nextCommitment.requireSignature(v, r, s);

        require(
            validTransition(_challengeCommitment, _nextCommitment),
            "must be a valid transition"
        );

        return true;
    }

    function validAlternativeRespondWithMove(
        Commitment.CommitmentStruct memory _challengeCommitment,
        Commitment.CommitmentStruct memory _alternativeCommitment,
        Commitment.CommitmentStruct memory _nextCommitment,
        uint8[] memory v,
        bytes32[] memory r,
        bytes32[] memory s
    ) public pure returns (bool) {

        // checking the alternative Commitment:
        require(
            _challengeCommitment.channelId() == _alternativeCommitment.channelId(),
            "alternativeCommitment must have the right channel"
        );
        require(
            _challengeCommitment.turnNum == _alternativeCommitment.turnNum,
            "alternativeCommitment must have the same nonce as the challenge commitment"
        );
        // .. it must be signed (by the challenger)
        _alternativeCommitment.requireSignature(v[0], r[0], s[0]);

        // checking the nextCommitment:
        // .. it must be signed (my the challengee)
        _nextCommitment.requireSignature(v[1], r[1], s[1]);
        require(
            validTransition(_alternativeCommitment, _nextCommitment),
            "it must be a valid transition of the appcommitment (from the alternative commitment)"
        );

        return true;
    }

    function validTransition(
        Commitment.CommitmentStruct memory  _fromCommitment,
        Commitment.CommitmentStruct memory _toCommitment
    ) public pure returns (bool) {
        require(
            _toCommitment.channelId() == _fromCommitment.channelId(),
            "Invalid transition: channelId must match on toCommitment"
        );
        require(
            _toCommitment.turnNum == _fromCommitment.turnNum + 1,
            "Invalid transition: turnNum must increase by 1"
        );

        if (_fromCommitment.isPreFundSetup()) {
            return validTransitionFromPreFundSetup(_fromCommitment, _toCommitment);
        } else if (_fromCommitment.isPostFundSetup()) {
            return validTransitionFromPostFundSetup(_fromCommitment, _toCommitment);
        } else if (_fromCommitment.isApp()) {
            return validTransitionFromApp(_fromCommitment, _toCommitment);
        } else if (_fromCommitment.isConclude()) {
            return validTransitionFromConclude(_fromCommitment, _toCommitment);
        }

        return true;
    }

    function validTransitionFromPreFundSetup(
        Commitment.CommitmentStruct memory _fromCommitment,
        Commitment.CommitmentStruct memory _toCommitment
    ) public pure returns (bool) {
        if (_fromCommitment.commitmentCount == _fromCommitment.participants.length - 1) {
            // there are two options from the final PreFundSetup Commitment
            // 1. PreFundSetup -> PostFundSetup transition
            // 2. PreFundSetup -> Conclude transition
            if (_toCommitment.isPostFundSetup()) {
                require(
                    _toCommitment.commitmentCount == 0,
                    "Invalid transition from PreFundSetup: commitmentCount must be reset when transitioning to PostFundSetup"
                );
                require(
                    Commitment.appAttributesEqual(_fromCommitment, _toCommitment),
                    "Invalid transition from PreFundSetup: appAttributes must be equal"
                );
                require(
                    Commitment.allocationsEqual(_fromCommitment, _toCommitment),
                    "Invalid transition from PreFundSetup: allocations must be equal"
                );
                require(
                    Commitment.destinationsEqual(_fromCommitment, _toCommitment),
                    "Invalid transition from PreFundSetup: destinations must be equal"
                );
            } else {
                require(
                    _toCommitment.isConclude(),
                    "Invalid transition from PreFundSetup: commitmentType must be Conclude"
                );
                require(
                    Commitment.allocationsEqual(_fromCommitment, _toCommitment),
                    "Invalid transition from PreFundSetup: allocations must be equal"
                );
                require(
                    Commitment.destinationsEqual(_fromCommitment, _toCommitment),
                    "Invalid transition from PreFundSetup: destinations must be equal"
                );
                
            }
        } else {
            // PreFundSetup -> PreFundSetup transition
            require(
                _toCommitment.isPreFundSetup(),
                "Invalid transition from PreFundSetup: commitmentType must be PreFundSetup"
            );
            require(
                Commitment.appAttributesEqual(_fromCommitment, _toCommitment),
                "Invalid transition from PreFundSetup: appAttributes must be equal"
            );
            require(
                _toCommitment.commitmentCount == _fromCommitment.commitmentCount + 1,
                "Invalid transition from PreFundSetup: commitmentCount must increase by 1"
            );
            require(
                Commitment.allocationsEqual(_fromCommitment, _toCommitment),
                "Invalid transition from PreFundSetup: allocations must be equal"
            );
            require(
                Commitment.destinationsEqual(_fromCommitment, _toCommitment),
                "Invalid transition from PreFundSetup: destinations must be equal"
            );
        }
        return true;
    }

    function validTransitionFromPostFundSetup(
        Commitment.CommitmentStruct memory  _fromCommitment,
        Commitment.CommitmentStruct memory _toCommitment
    ) public pure returns (bool) {
        if (_fromCommitment.commitmentCount == _fromCommitment.participants.length - 1) {
            if (_toCommitment.isApp()) {
                require(
                    validAppTransition(_fromCommitment, _toCommitment),
                    "Invalid transition from PostFundSetup: transition must be valid"
                );
            } else {
                require(
                    _toCommitment.isConclude(),
                    "Invalid transition from PostFundSetup: commitmentType must be Conclude"
                );

                require(
                    Commitment.allocationsEqual(_fromCommitment, _toCommitment),
                    "Invalid transition from PostFundSetup: allocations must be equal"
                );
                require(
                    Commitment.destinationsEqual(_fromCommitment, _toCommitment),
                    "Invalid transition from PostFundSetup: destinations must be equal"
                );

                require(
                    _toCommitment.commitmentCount == 0,
                    "Invalid transition from PostFundSetup: commitmentCount must be reset when transitioning to Conclude"
                );
            }
        } else {
            // Two possibilities:
            // 1. PostFundSetup -> PostFundSetup transition
            // 2. PostFundSetup -> Conclude transition
            if (_toCommitment.isPostFundSetup()) {
                // PostFundSetup -> PostFundSetup
                require(
                    Commitment.appAttributesEqual(_fromCommitment, _toCommitment),
                    "Invalid transition from PostFundSetup: appAttributes must be equal"
                );
                require(
                    _toCommitment.commitmentCount == _fromCommitment.commitmentCount + 1,
                    "Invalid transition from PostFundSetup: commitmentCount must increase by 1"
                );
                require(
                    Commitment.allocationsEqual(_fromCommitment, _toCommitment),
                    "Invalid transition from PostFundSetup: allocations must be equal"
                );
                require(
                    Commitment.destinationsEqual(_fromCommitment, _toCommitment),
                    "Invalid transition from PostFundSetup: destinations must be equal"
                );
            } else {
                // PostFundSetup -> Conclude
                require(
                    _toCommitment.isConclude(),
                    "Invalid transition from PostFundSetup: commitmentType must be Conclude"
                );
                require(
                    Commitment.allocationsEqual(_fromCommitment, _toCommitment),
                    "Invalid transition from PostFundSetup: allocations must be equal"
                );
                require(
                    Commitment.destinationsEqual(_fromCommitment, _toCommitment),
                    "Invalid transition from PostFundSetup: destinations must be equal"
                );
            }
        }
        return true;
    }

    function validTransitionFromApp(
        Commitment.CommitmentStruct memory _fromCommitment,
        Commitment.CommitmentStruct memory _toCommitment
    ) public pure returns (bool) {
        if (_toCommitment.isApp()) {
            require(
                validAppTransition(_fromCommitment, _toCommitment),
                "Invalid transition from App: transition must be valid"
            );
        } else {
            require(
                _toCommitment.isConclude(),
                "Invalid transition from App: commitmentType must be Conclude"
            );
            require(
                Commitment.allocationsEqual(_fromCommitment, _toCommitment),
                "Invalid transition from App: allocations must be equal"
            );
            require(
                Commitment.destinationsEqual(_fromCommitment, _toCommitment),
                "Invalid transition from App: destinations must be equal"
            );
        }
        return true;
    }

    function validTransitionFromConclude(
        Commitment.CommitmentStruct memory _fromCommitment,
        Commitment.CommitmentStruct memory _toCommitment
    ) public pure returns (bool) {
        require(
            _toCommitment.isConclude(),
            "Invalid transition from Conclude: commitmentType must be Conclude"
        );
        require(
            Commitment.allocationsEqual(_fromCommitment, _toCommitment),
            "Invalid transition from Conclude: allocations must be equal"
        );
        require(
            Commitment.destinationsEqual(_fromCommitment, _toCommitment),
            "Invalid transition from Conclude: destinations must be equal"
        );
        return true;
    }

    function validAppTransition(
        Commitment.CommitmentStruct memory _fromCommitment,
        Commitment.CommitmentStruct memory _toCommitment
    ) public pure returns (bool) {
        return ForceMoveApp(_fromCommitment.channelType).validTransition(_fromCommitment, _toCommitment);
    }
}
