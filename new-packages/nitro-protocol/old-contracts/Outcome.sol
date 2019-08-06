pragma solidity ^0.5.2;
pragma experimental ABIEncoderV2;

library Outcome {
    struct TokenOutcomeItem {
        address token;
        bytes typedOutcome; // TypedOutcome
    }

    enum OutcomeType { Allocation, Guarantee }

    struct TypedOutcome {
        uint8 outcomeType; // OutcomeType
        bytes data; // either AllocationItem[] or Guarantee, depending on OutcomeType
    }

    // reserve Allocation to refer to AllocationItem[]
    struct AllocationItem {
        address destination;
        uint256 amount;
    }
    // e.g. {0xAlice, 5}

    struct Guarantee {
        address guaranteedChannelId;
        address[] destinations;
    }

    function toTokenOutcome(bytes memory tokenOutcomeBytes) public pure returns (TokenOutcomeItem[] memory) {
      return abi.decode(tokenOutcomeBytes, (TokenOutcomeItem[]));
    }

    function toTypedOutcome(bytes memory typedOutcomeBytes)
        public
        pure
        returns (TypedOutcome memory)
    {
        return abi.decode(typedOutcomeBytes, (TypedOutcome));
    }

    function isAllocation(TypedOutcome memory typedOutcome) public pure returns (bool) {
        return typedOutcome.outcomeType == uint8(OutcomeType.Allocation);
    }

    // should have determined that isAllocation before calling
    function toAllocation(bytes memory outcomeContent)
        public
        pure
        returns (AllocationItem[] memory)
    {
        return abi.decode(outcomeContent, (AllocationItem[]));
    }

    function isGuarantee(TypedOutcome memory typedOutcome) public pure returns (bool) {
        return typedOutcome.outcomeType == uint8(OutcomeType.Guarantee);
    }

    // should have determined that isGuarantee before calling
    function toGuarantee(bytes memory outcomeContent) public pure returns (Guarantee memory) {
        return abi.decode(outcomeContent, (Guarantee));
    }
}
