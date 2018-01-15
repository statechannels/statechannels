pragma solidity ^0.4.18;

contract ChannelManager {
  address participantA;
  address participantB;

  // as a v2 we'd want to replace the FundAllocation with a FundingProof, so that
  // you don't have to reveal the whole off-chain fund allocation
  struct FundAllocation {
    uint nonce;

    uint aBalance;
    uint bBalance;

    bytes[] channelIds;
    uint[] channelBalances;

    bytes aSignature;
    bytes bSignature;
  }

  struct Channel {
    bytes32 id;
    address channelType; // address of channel's on-chain state code, used to uniquely define the
    // channel type
    uint number;   // number is chosen off-chain, such that the (channelType, number) pair is always unique
  }

  struct State {
    Channel channel;
    uint nonce;
    uint fundsRequired;

    bytes contents;

    bytes aSignature;
    bytes bSignature;
  }

  struct Challenge {
    FundAllocation allocation;
    State state;
    uint challengePeriodEnd;
    bool challengeIsForA; // otherwise it is for B
  }

  mapping(uint => Challenge) challenges;


  // I really want the signature here to be initiateChallenge(FundAllocation _f, State _s)
  function _initiateChallenge(FundAllocation _allocation, State _state) internal {
    // funding allocation is valid
    // funding allocation is double signed
    // funding allocation funds state

    // state is double signed
    // state is valid
    // set the expiry date
    // add challenge to the list of challenges
  }

  function makeMove(Challenge _challenge, State _newState) internal {
    // check that the new state is valid
    // needs to be signed by the person the challenge is for
    // check that the transition is valid

    // cancel the challenge

  }

  function refuteChallengeFunding(Challenge _challenge, FundAllocation _moreRecentFundAllocation) internal {
    // check that the new state is for the right channel
    // check that the new state has a higher nonce
    // check that the newstate is double signed

    // cancel the challenge

  }

  function refuteChallengeState(Challenge _challenge, State _moreRecentState) internal {

  }

  function resolveChallenge(Challenge _challenge) internal {
    // check that the challenge period has ended

    // call the resolution function.. which returns an array of addresses to send the funds to.


  }


  // -------------------------------------------
  // here be dragons

  // public functions to work around the fact that the abi doesn't support structs

  function initiateChallenge(
    // fund allocation
    uint _allocationNonce,
    uint _aBalance,
    uint _bBalance,
    bytes[] _channelIds, // because we can't have a mapping in the function signature
    uint[] _channelBalances,
    bytes _allocationASignature,
    bytes _allocationBSignature,
    // state
    address _channelType,
    uint _channelNumber,
    uint _stateNonce,
    uint _fundsRequired,

    bytes _contents,

    bytes _stateASignature,
    bytes _stateBSignature
    ) public {
      FundAllocation memory allocation = FundAllocation(
        _allocationNonce,
        _aBalance,
        _bBalance,
        _channelIds,
        _channelBalances,
        _allocationASignature,
        _allocationBSignature
      );
      Channel memory channel = Channel(
        keccak256(_channelType, _channelNumber),
        _channelType,
        _channelNumber
      );
      State memory state = State(channel, _stateNonce, _fundsRequired, _contents, _stateASignature, _stateBSignature);

      _initiateChallenge(allocation, state);
   }
}
