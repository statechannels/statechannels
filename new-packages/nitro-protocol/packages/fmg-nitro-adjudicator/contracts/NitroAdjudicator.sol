pragma solidity ^0.5.2;
pragma experimental ABIEncoderV2;
import "fmg-core/contracts/Commitment.sol";
import "fmg-core/contracts/Rules.sol";
import "openzeppelin-solidity/contracts/math/SafeMath.sol";

contract NitroAdjudicator {
    using Commitment for Commitment.CommitmentStruct;
    using SafeMath for uint;

    struct Authorization {
        // Prevents replay attacks:
        // It's required that the participant signs the message, meaning only
        // the participant can authorize a withdrawal.
        // Moreover, the participant should sign the address that they wish
        // to send the transaction from, preventing any replay attack.
        address participant; // the account used to sign commitment transitions
        address destination; // either an account or a channel
        uint amount;
        address sender; // the account used to sign transactions
    }

    struct Outcome {
        address[] destination;
        uint256 finalizedAt;
        Commitment.CommitmentStruct challengeCommitment;

        // exactly one of the following two should be non-null
        // guarantee channels
        uint[] allocation;         // should be zero length in guarantee channels
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

    mapping(address => uint) public holdings;
    mapping(address => Outcome) public outcomes;
    address private constant zeroAddress = address(0);

    // TODO: Challenge duration should depend on the channel
    uint constant CHALLENGE_DURATION = 5 minutes;

    // **************
    // Eth Management
    // **************

    function deposit(address destination, uint expectedHeld) public payable {
        uint amount = msg.value;
        uint amountDeposited;

        // This protects against a directly funded channel being defunded due to chain re-orgs,
        // and allow a wallet implementation to ensure the safety of deposits.
        require(
            holdings[destination] >= expectedHeld,
            "Deposit: holdings[destination] is less than expected"
        );


        // If I expect there to be 10 eth and deposit 2, my goal was to get the
        // balance to 12 eth.
        // In case some arbitrary person deposited 1 eth before I noticed, making the
        // holdings 11 eth, I should be refunded 1 eth.
        if (holdings[destination] == expectedHeld) {
            amountDeposited = amount;
        } else if (holdings[destination] < expectedHeld.add(amount)) {
            amountDeposited = expectedHeld.add(amount).sub(holdings[destination]);
        } else {
            amountDeposited = 0;
        }

        holdings[destination] = holdings[destination].add(amountDeposited);
        if (amountDeposited < amount) {
            // refund whatever wasn't deposited.
            msg.sender.transfer(amount - amountDeposited);
        }

        emit Deposited(destination, amountDeposited, holdings[destination]);
    }

    function transferAndWithdraw(address channel,
        address participant,
        address payable destination,
        uint amount,
        uint8 _v,
        bytes32 _r,
        bytes32 _s
    ) public payable {
        transfer(channel, participant, amount);
        withdraw(participant, destination, amount, _v, _r ,_s);
    }

    function withdraw(address participant,
        address payable destination,
        uint amount,
        uint8 _v,
        bytes32 _r,
        bytes32 _s
    ) public payable {
        require(
            holdings[participant] >= amount,
            "Withdraw: overdrawn"
        );
        Authorization memory authorization = Authorization(
            participant,
            destination,
            amount,
            msg.sender
        );

        require(
            recoverSigner(abi.encode(authorization), _v, _r, _s) == participant,
            "Withdraw: not authorized by participant"
        );

        holdings[participant] = holdings[participant].sub(amount);
        destination.transfer(amount);
    }

    function transfer(address channel, address destination, uint amount) public {
        require(
            outcomes[channel].challengeCommitment.guaranteedChannel == zeroAddress,
            "Transfer: channel must be a ledger channel"
        );
        require(
            outcomes[channel].finalizedAt <= now,
            "Transfer: outcome must be final"
        );
        require(
            outcomes[channel].finalizedAt > 0,
            "Transfer: outcome must be present"
        );

        uint channelAffordsForDestination = affords(destination, outcomes[channel], holdings[channel]);

        require(
            amount <= channelAffordsForDestination,
            "Transfer: channel cannot afford the requested transfer amount"
        );

        holdings[destination] = holdings[destination] + amount;
        holdings[channel] = holdings[channel] - amount;

        outcomes[channel] = reduce(outcomes[channel], destination, amount);
    }

    function claim(address guarantor, address recipient, uint amount) public {
        Outcome memory guarantee = outcomes[guarantor];
        require(
            guarantee.challengeCommitment.guaranteedChannel != zeroAddress,
            "Claim: a guarantee channel is required"
        );

        require(
            isChannelClosed(guarantor),
            "Claim: channel must be closed"
        );

        uint funding = holdings[guarantor];
        Outcome memory reprioritizedOutcome = reprioritize(
            outcomes[guarantee.challengeCommitment.guaranteedChannel],
            guarantee
        );
        if (affords(recipient, reprioritizedOutcome, funding) >= amount) {
            outcomes[guarantee.challengeCommitment.guaranteedChannel] = reduce(
                outcomes[guarantee.challengeCommitment.guaranteedChannel],
                recipient,
                amount
            );
            holdings[guarantor] = holdings[guarantor].sub(amount);
            holdings[recipient] = holdings[recipient].add(amount);
        } else {
            revert('Claim: guarantor must be sufficiently funded');
        }
    }

    // ********************
    // Eth Management Logic
    // ********************

    function reprioritize(
        Outcome memory allocation,
        Outcome memory guarantee
    ) internal pure returns (Outcome memory) {
        require(
            guarantee.challengeCommitment.guaranteedChannel != address(0),
            "Claim: a guarantee channel is required"
        );
        address[] memory newDestination = new address[](guarantee.destination.length);
        uint[] memory newAllocation = new uint[](guarantee.destination.length);
        for (uint aIdx = 0; aIdx < allocation.destination.length; aIdx++) {
            for (uint gIdx = 0; gIdx < guarantee.destination.length; gIdx++) {
                if (guarantee.destination[gIdx] == allocation.destination[aIdx]) {
                    newDestination[gIdx] = allocation.destination[aIdx];
                    newAllocation[gIdx] = allocation.allocation[aIdx];
                    break;
                }
            }
        }

        return Outcome(
            newDestination,
            allocation.finalizedAt,
            allocation.challengeCommitment,
            newAllocation
        );
    }

    function affords(
        address recipient,
        Outcome memory outcome,
        uint funding
    ) internal pure returns (uint256) {
        uint result = 0;
        uint remainingFunding = funding;

        for (uint i = 0; i < outcome.destination.length; i++) {
            if (remainingFunding <= 0) {
                break;
            }

            if (outcome.destination[i] == recipient) {
                // It is technically allowed for a recipient to be listed in the
                // outcome multiple times, so we must iterate through the entire
                // array.
                result = result.add(min(outcome.allocation[i], remainingFunding));
            }
            if (remainingFunding > outcome.allocation[i]){
                remainingFunding = remainingFunding.sub(outcome.allocation[i]);
            }else{
                remainingFunding = 0;
            }
        }

        return result;
    }

    function reduce(
        Outcome memory outcome,
        address recipient,
        uint amount
    ) internal pure returns (Outcome memory) {
        uint256[] memory updatedAllocation = outcome.allocation;
        uint256 reduction = 0;
        uint remainingAmount = amount;
        for (uint i = 0; i < outcome.destination.length; i++) {
            if (outcome.destination[i] == recipient) {
                // It is technically allowed for a recipient to be listed in the
                // outcome multiple times, so we must iterate through the entire
                // array.
                reduction = reduction.add(min(outcome.allocation[i], remainingAmount));
                remainingAmount = remainingAmount.sub(reduction);
                updatedAllocation[i] = updatedAllocation[i].sub(reduction);
            }
        }

        return Outcome(
            outcome.destination,
            outcome.finalizedAt,
            outcome.challengeCommitment, // Once the outcome is finalized,
            updatedAllocation
        );
    }

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
    event Deposited(address destination, uint256 amountDeposited, uint256 destinationHoldings);
    // **********************
    // ForceMove Protocol API
    // **********************

    function conclude(ConclusionProof memory proof) public {
        _conclude(proof);
    }

    function concludeAndWithdraw(ConclusionProof memory proof,
        address participant,
        address payable destination,
        uint amount,
        uint8 _v,
        bytes32 _r,
        bytes32 _s
    ) public{
        address channelId = proof.penultimateCommitment.channelId();
        if (outcomes[channelId].finalizedAt > now || outcomes[channelId].finalizedAt == 0){
        _conclude(proof);
        } else {
            require(keccak256(abi.encode(proof.penultimateCommitment)) == keccak256(abi.encode(outcomes[channelId].challengeCommitment)),
            "concludeAndWithdraw: channel already concluded with a different proof");
        }
        transfer(channelId,participant, amount);
        withdraw(participant,destination, amount, _v,_r,_s);
    }

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
            challengeCommitment.allocation
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
            refutationCommitment.allocation
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
            responseCommitment.allocation
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
            _responseCommitment.allocation
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
            proof.penultimateCommitment.allocation
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