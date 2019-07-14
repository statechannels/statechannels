pragma solidity ^0.5.2;
pragma experimental ABIEncoderV2;
import "openzeppelin-solidity/contracts/math/SafeMath.sol";
import "fmg-core/contracts/Commitment.sol";
import "fmg-core/contracts/Rules.sol";

contract NitroAdjudicator {
    using Commitment for Commitment.CommitmentStruct;

    struct Outcome {
        address[] destination;
        uint256 finalizedAt;
        Commitment.CommitmentStruct challengeCommitment;

        // exactly one of the following two should be non-null
        // guarantee channels
        uint[] allocation;         // should be zero length in guarantee channels

        address[] token;
    }

    struct Signature {
        uint8 v;
        bytes32 r;
        bytes32 s;
    }
    struct ConclusionProof {
        Commitment.CommitmentStruct penultimateCommitment;
        Signature penultimateSignature;
        Commitment.CommitmentStruct ultimateCommitment;
        Signature ultimateSignature;
    }


    mapping(address => Outcome) internal outcomes;

    function getOutcome(address channel) public view returns (Outcome memory) {
        return outcomes[channel];
    }
    // TODO: Challenge duration should depend on the channel
    uint constant CHALLENGE_DURATION = 5 minutes;


    // ****************
    // ForceMove Events
    // ****************

    event ChallengeCreated(
        address channelId,
        Commitment.CommitmentStruct commitment,
        uint256 finalizedAt
    );
    event Concluded(address channelId);
    event Refuted(address channelId, Commitment.CommitmentStruct refutation);
    event RespondedWithMove(address channelId, Commitment.CommitmentStruct response, uint8 v, bytes32 r, bytes32 ss);
    event RespondedWithAlternativeMove(Commitment.CommitmentStruct alternativeResponse);

    // **********************
    // ForceMove Protocol API
    // **********************

    function conclude(ConclusionProof memory proof) public {
        _conclude(proof);
    }

    // TODO this function should be moved to NitroVault
    // function concludeAndWithdraw(ConclusionProof memory proof,
    //     address participant,
    //     address payable destination,
    //     uint amount,
    //     address token,
    //     uint8 _v,
    //     bytes32 _r,
    //     bytes32 _s
    // ) public{
    //     address channelId = proof.penultimateCommitment.channelId();
    //     if (outcomes[channelId].finalizedAt > now || outcomes[channelId].finalizedAt == 0){
    //     _conclude(proof);
    //     } else {
    //         require(keccak256(abi.encode(proof.penultimateCommitment)) == keccak256(abi.encode(outcomes[channelId].challengeCommitment)),
    //         "concludeAndWithdraw: channel already concluded with a different proof");
    //     }
    //     transfer(channelId,participant, amount, token);
    //     withdraw(participant,destination, amount, token, _v,_r,_s);
    // }

    function forceMove(
        Commitment.CommitmentStruct memory agreedCommitment,
        Commitment.CommitmentStruct memory challengeCommitment,
        Signature[] memory signatures
    ) public {
        require(
            !isChannelClosed(agreedCommitment.channelId()),
            "ForceMove: channel must be open"
        );
        require(
            moveAuthorized(agreedCommitment, signatures[0]),
            "ForceMove: agreedCommitment not authorized"
        );
        require(
            moveAuthorized(challengeCommitment, signatures[1]),
            "ForceMove: challengeCommitment not authorized"
        );
        require(
            Rules.validTransition(agreedCommitment, challengeCommitment),
            "ForceMove: Invalid transition"
        );

        address channelId = agreedCommitment.channelId();

        outcomes[channelId] = Outcome(
            challengeCommitment.participants,
            now + CHALLENGE_DURATION,
            challengeCommitment,
            challengeCommitment.allocation,
            challengeCommitment.token
        );

        emit ChallengeCreated(
            channelId,
            challengeCommitment,
            now + CHALLENGE_DURATION
        );
    }

    function refute(Commitment.CommitmentStruct memory refutationCommitment, Signature memory signature) public {
        address channel = refutationCommitment.channelId();
        require(
            !isChannelClosed(channel),
            "Refute: channel must be open"
        );

        require(
            moveAuthorized(refutationCommitment, signature),
            "Refute: move must be authorized"
        );

        require(
            Rules.validRefute(outcomes[channel].challengeCommitment, refutationCommitment, signature.v, signature.r, signature.s),
            "Refute: must be a valid refute"
        );

        emit Refuted(channel, refutationCommitment);
        Outcome memory updatedOutcome = Outcome(
            outcomes[channel].destination,
            0,
            refutationCommitment,
            refutationCommitment.allocation,
            refutationCommitment.token
        );
        outcomes[channel] = updatedOutcome;
    }

    function respondWithMove(Commitment.CommitmentStruct memory responseCommitment, Signature memory signature) public {
        address channel = responseCommitment.channelId();
        require(
            !isChannelClosed(channel),
            "RespondWithMove: channel must be open"
        );

        require(
            moveAuthorized(responseCommitment, signature),
            "RespondWithMove: move must be authorized"
        );

        require(
            Rules.validRespondWithMove(outcomes[channel].challengeCommitment, responseCommitment, signature.v, signature.r, signature.s),
            "RespondWithMove: must be a valid response"
        );

        emit RespondedWithMove(channel, responseCommitment, signature.v, signature.r, signature.s);

        Outcome memory updatedOutcome = Outcome(
            outcomes[channel].destination,
            0,
            responseCommitment,
            responseCommitment.allocation,
            responseCommitment.token
        );
        outcomes[channel] = updatedOutcome;
    }

    function alternativeRespondWithMove(
        Commitment.CommitmentStruct memory _alternativeCommitment,
        Commitment.CommitmentStruct memory _responseCommitment,
        Signature memory _alternativeSignature,
        Signature memory _responseSignature
    )
      public
    {
        address channel = _responseCommitment.channelId();
        require(
            !isChannelClosed(channel),
            "AlternativeRespondWithMove: channel must be open"
        );

        require(
            moveAuthorized(_responseCommitment, _responseSignature),
            "AlternativeRespondWithMove: move must be authorized"
        );

        uint8[] memory v = new uint8[](2);
        v[0] = _alternativeSignature.v;
        v[1] = _responseSignature.v;

        bytes32[] memory r = new bytes32[](2);
        r[0] = _alternativeSignature.r;
        r[1] = _responseSignature.r;

        bytes32[] memory s = new bytes32[](2);
        s[0] = _alternativeSignature.s;
        s[1] = _responseSignature.s;


        require(
            Rules.validAlternativeRespondWithMove(
                outcomes[channel].challengeCommitment,
                _alternativeCommitment,
                _responseCommitment,
                v,
                r,
                s
            ),
            "RespondWithMove: must be a valid response"
        );

        emit RespondedWithAlternativeMove(_responseCommitment);

        Outcome memory updatedOutcome = Outcome(
            outcomes[channel].destination,
            0,
            _responseCommitment,
            _responseCommitment.allocation,
            _responseCommitment.token
        );
        outcomes[channel] = updatedOutcome;
    }

    // ************************
    // ForceMove Protocol Logic
    // ************************

    function _conclude(ConclusionProof memory proof) internal {
        address channelId = proof.penultimateCommitment.channelId();
        require(
            (outcomes[channelId].finalizedAt > now || outcomes[channelId].finalizedAt == 0),
            "Conclude: channel must not be finalized"
        );

        outcomes[channelId] = Outcome(
            proof.penultimateCommitment.destination,
            now,
            proof.penultimateCommitment,
            proof.penultimateCommitment.allocation,
            proof.penultimateCommitment.token
        );
        emit Concluded(channelId);
    }

    // ****************
    // Helper functions
    // ****************

    function isChannelClosed(address channel) internal view returns (bool) {
        return outcomes[channel].finalizedAt < now && outcomes[channel].finalizedAt > 0;
    }

    function moveAuthorized(Commitment.CommitmentStruct memory _commitment, Signature memory signature) internal pure returns (bool){
        return _commitment.mover() == recoverSigner(
            abi.encode(_commitment),
            signature.v,
            signature.r,
            signature.s
        );
    }

    function recoverSigner(bytes memory _d, uint8 _v, bytes32 _r, bytes32 _s) internal pure returns(address) {
        bytes memory prefix = "\x19Ethereum Signed Message:\n32";
        bytes32 h = keccak256(_d);

        bytes32 prefixedHash = keccak256(abi.encodePacked(prefix, h));

        address a = ecrecover(prefixedHash, _v, _r, _s);

        return(a);
    }

    function min(uint a, uint b) internal pure returns (uint) {
        if (a <= b) {
            return a;
        }

        return b;
    }
}