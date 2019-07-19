pragma solidity ^0.5.2;
pragma experimental ABIEncoderV2;
import "openzeppelin-solidity/contracts/math/SafeMath.sol";
import "fmg-core/contracts/Commitment.sol";
import "fmg-core/contracts/Rules.sol";

contract IERC20 { // Abstraction of the parts of the ERC20 Interface that we need
    function transfer(address to, uint tokens) public returns (bool success);
    function transferFrom(address from, address to, uint tokens) public returns (bool success);
}

contract INitroLibrary { // Abstraction of the NitroLibrary contract

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

    function recoverSigner(bytes calldata _d, uint8 _v, bytes32 _r, bytes32 _s) external pure returns(address);

    function affords(
        address recipient,
        Outcome calldata outcome,
        uint funding
    ) external pure returns (uint256);

    function reprioritize(
        Outcome calldata allocation,
        Outcome calldata guarantee
    ) external pure returns (Outcome memory);

    function moveAuthorized(Commitment.CommitmentStruct calldata _commitment, Signature calldata signature) external pure returns (bool);

        function reduce(
        Outcome memory outcome,
        address recipient,
        uint amount,
        address token
    ) public pure returns (Outcome memory);
}

contract NitroAdjudicator {
    using Commitment for Commitment.CommitmentStruct;
    using SafeMath for uint;
    INitroLibrary Library; // Abs

    constructor(address _NitroLibraryAddress) public {
        Library = INitroLibrary(_NitroLibraryAddress); // Abs
    }

    // TODO: Challenge duration should depend on the channel
    uint constant CHALLENGE_DURATION = 5 minutes;

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

    struct ConclusionProof {
        Commitment.CommitmentStruct penultimateCommitment;
        INitroLibrary.Signature penultimateSignature; // Abs
        Commitment.CommitmentStruct ultimateCommitment;
        INitroLibrary.Signature ultimateSignature; // Abs
    }

    mapping(address => mapping(address => uint)) public holdings;
    mapping(address => INitroLibrary.Outcome) public outcomes; // Abs
    address private constant zeroAddress = address(0);

    // **************
    // ETH and Token Management
    // **************


function deposit(address destination, uint expectedHeld,
 uint amount, address token) public payable {
       if (token == zeroAddress) {
        require(msg.value == amount, "Insufficient ETH for ETH deposit");
        } else {
            IERC20 _token = IERC20(token);
            require(_token.transferFrom(msg.sender,address(this),amount), 'Could not deposit ERC20s');
            }

        uint amountDeposited;
        // This protects against a directly funded channel being defunded due to chain re-orgs,
        // and allow a wallet implementation to ensure the safety of deposits.
        require(
            holdings[destination][token] >= expectedHeld,
            "Deposit: holdings[destination][token] is less than expected"
        );

        // If I expect there to be 10 and deposit 2, my goal was to get the
        // balance to 12.
        // In case some arbitrary person deposited 1 eth before I noticed, making the
        // holdings 11, I should be refunded 1.
        if (holdings[destination][token] == expectedHeld) {
            amountDeposited = amount;
        } else if (holdings[destination][token] < expectedHeld.add(amount)) {
            amountDeposited = expectedHeld.add(amount).sub(holdings[destination][token]);
        } else {
            amountDeposited = 0;
        }
        holdings[destination][token] = holdings[destination][token].add(amountDeposited);
        if (amountDeposited < amount) {
            // refund whatever wasn't deposited.
            if (token == zeroAddress) {
              msg.sender.transfer(amount - amountDeposited); // TODO use safeMath here
          }
            else {
                IERC20 _token = IERC20(token);
                _token.transfer(msg.sender, amount - amountDeposited); // TODO use safeMath here
                // TODO compute amountDeposited *before* calling into erc20 contract, so we only need 1 call not 2
                }
        }
        emit Deposited(destination, amountDeposited, holdings[destination][token]);
    }

    function transferAndWithdraw(address channel,
        address participant,
        address payable destination,
        uint amount,
        address token,
        uint8 _v,
        bytes32 _r,
        bytes32 _s
    ) public payable {
        transfer(channel, participant, amount, token);
        withdraw(participant, destination, amount, token, _v, _r ,_s);
    }

    function withdraw(address participant,
        address payable destination,
        uint amount,
        address token,
        uint8 _v,
        bytes32 _r,
        bytes32 _s
    ) public payable {
        require(
            holdings[participant][token] >= amount,
            "Withdraw: overdrawn"
        );
        Authorization memory authorization = Authorization(
            participant,
            destination,
            amount,
            msg.sender
        );

        require(
            Library.recoverSigner(abi.encode(authorization), _v, _r, _s) == participant,
            "Withdraw: not authorized by participant"
        );

        holdings[participant][token] = holdings[participant][token].sub(amount);
        // Decrease holdings before calling to token contract (protect against reentrancy)
        if (token == zeroAddress) {destination.transfer(amount);}
        else {
            IERC20 _token = IERC20(token);
            _token.transfer(destination,amount);
            }

    }


    function transfer(address channel, address destination, uint amount, address token) public {
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

        uint channelAffordsForDestination = Library.affords(destination, outcomes[channel], holdings[channel][token]);

        require(
            amount <= channelAffordsForDestination,
            "Transfer: channel cannot afford the requested transfer amount"
        );

        holdings[destination][token] = holdings[destination][token] + amount;
        holdings[channel][token] = holdings[channel][token] - amount;
    }


    function concludeAndWithdraw(ConclusionProof memory proof,
        address participant,
        address payable destination,
        uint amount,
        address token,
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
        transfer(channelId,participant, amount, token);
        withdraw(participant,destination, amount, token, _v,_r,_s);
    }

    function claim(address guarantor, address recipient, uint amount, address token) public {
        INitroLibrary.Outcome memory guarantee = outcomes[guarantor]; // Abs
        require(
            guarantee.challengeCommitment.guaranteedChannel != zeroAddress,
            "Claim: a guarantee channel is required"
        );

        require(
            isChannelClosed(guarantor),
            "Claim: channel must be closed"
        );

        uint funding = holdings[guarantor][token];
        INitroLibrary.Outcome memory reprioritizedOutcome = Library.reprioritize( // Abs
            outcomes[guarantee.challengeCommitment.guaranteedChannel],
            guarantee
        );
        if (Library.affords(recipient, reprioritizedOutcome, funding) >= amount) {
            outcomes[guarantee.challengeCommitment.guaranteedChannel] = Library.reduce(
                outcomes[guarantee.challengeCommitment.guaranteedChannel],
                recipient,
                amount,
                token
            );
            holdings[guarantor][token] = holdings[guarantor][token].sub(amount);
            holdings[recipient][token] = holdings[recipient][token].add(amount);
        } else {
            revert('Claim: guarantor must be sufficiently funded');
        }
    }



    // **********************
    // ForceMove Protocol API
    // **********************

    function conclude(ConclusionProof memory proof) public {
        _conclude(proof);
    }



    function forceMove(
        Commitment.CommitmentStruct memory agreedCommitment,
        Commitment.CommitmentStruct memory challengeCommitment,
        INitroLibrary.Signature[] memory signatures // Abs
    ) public {
        require(
            !isChannelClosed(agreedCommitment.channelId()),
            "ForceMove: channel must be open"
        );
        require(
            Library.moveAuthorized(agreedCommitment, signatures[0]),
            "ForceMove: agreedCommitment not authorized"
        );
        require(
            Library.moveAuthorized(challengeCommitment, signatures[1]),
            "ForceMove: challengeCommitment not authorized"
        );
        require(
            Rules.validTransition(agreedCommitment, challengeCommitment),
            "ForceMove: Invalid transition"
        );

        address channelId = agreedCommitment.channelId();

        outcomes[channelId] = INitroLibrary.Outcome( // Abs
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

    function refute(Commitment.CommitmentStruct memory refutationCommitment, INitroLibrary.Signature memory signature) public { // Abs
        address channel = refutationCommitment.channelId();
        require(
            !isChannelClosed(channel),
            "Refute: channel must be open"
        );

        require(
            Library.moveAuthorized(refutationCommitment, signature),
            "Refute: move must be authorized"
        );

        require(
            Rules.validRefute(outcomes[channel].challengeCommitment, refutationCommitment, signature.v, signature.r, signature.s),
            "Refute: must be a valid refute"
        );

        emit Refuted(channel, refutationCommitment);
        INitroLibrary.Outcome memory updatedOutcome = INitroLibrary.Outcome( // Abs
            outcomes[channel].destination,
            0,
            refutationCommitment,
            refutationCommitment.allocation,
            refutationCommitment.token
        );
        outcomes[channel] = updatedOutcome;
    }

    function respondWithMove(Commitment.CommitmentStruct memory responseCommitment, INitroLibrary.Signature memory signature) public { // Abs
        address channel = responseCommitment.channelId();
        require(
            !isChannelClosed(channel),
            "RespondWithMove: channel must be open"
        );

        require(
            Library.moveAuthorized(responseCommitment, signature),
            "RespondWithMove: move must be authorized"
        );

        require(
            Rules.validRespondWithMove(outcomes[channel].challengeCommitment, responseCommitment, signature.v, signature.r, signature.s),
            "RespondWithMove: must be a valid response"
        );

        emit RespondedWithMove(channel, responseCommitment, signature.v, signature.r, signature.s);

        INitroLibrary.Outcome memory updatedOutcome = INitroLibrary.Outcome( // Abs
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
        INitroLibrary.Signature memory _alternativeSignature, // Abs
        INitroLibrary.Signature memory _responseSignature // Abs
    )
      public
    {
        address channel = _responseCommitment.channelId();
        require(
            !isChannelClosed(channel),
            "AlternativeRespondWithMove: channel must be open"
        );

        require(
            Library.moveAuthorized(_responseCommitment, _responseSignature),
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

        INitroLibrary.Outcome memory updatedOutcome = INitroLibrary.Outcome( // Abs
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

        outcomes[channelId] = INitroLibrary.Outcome( // Abs
            proof.penultimateCommitment.destination,
            now,
            proof.penultimateCommitment,
            proof.penultimateCommitment.allocation,
            proof.penultimateCommitment.token
        );
        emit Concluded(channelId);
    }

    function isChannelClosed(address channel) internal view returns (bool) {
        return outcomes[channel].finalizedAt < now && outcomes[channel].finalizedAt > 0;
    }

    // ****************
    // Events
    // ****************
    event Deposited(address destination, uint256 amountDeposited, uint256 destinationHoldings);

    event ChallengeCreated(
        address channelId,
        Commitment.CommitmentStruct commitment,
        uint256 finalizedAt
    );
    event Concluded(address channelId);
    event Refuted(address channelId, Commitment.CommitmentStruct refutation);
    event RespondedWithMove(address channelId, Commitment.CommitmentStruct response, uint8 v, bytes32 r, bytes32 ss);
    event RespondedWithAlternativeMove(Commitment.CommitmentStruct alternativeResponse);
}