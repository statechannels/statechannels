pragma solidity ^0.5.2;
pragma experimental ABIEncoderV2;

import "../Outcome.sol";

contract TestOutcome {
   function toTokenOutcome(bytes memory tokenOutcomeBytes) public pure returns (Outcome.TokenOutcomeItem[] memory) {
     return Outcome.toTokenOutcome(tokenOutcomeBytes);
    }

    function toTypedOutcome(bytes memory typedOutcomeBytes)
        public
        pure
        returns (Outcome.TypedOutcome memory)
    {
     return Outcome.toTypedOutcome(typedOutcomeBytes);
    }

    function isAllocation(Outcome.TypedOutcome memory typedOutcome) public pure returns (bool) {
     return Outcome.isAllocation(typedOutcome);
    }

    // should have determined that isAllocation before calling
    function toAllocation(bytes memory outcomeContent)
        public
        pure
        returns (Outcome.AllocationItem[] memory)
    {
     return Outcome.toAllocation(outcomeContent);
    }

    function isGuarantee(Outcome.TypedOutcome memory typedOutcome) public pure returns (bool) {
     return Outcome.isGuarantee(typedOutcome);
    }

    // should have determined that isGuarantee before calling
    function toGuarantee(bytes memory outcomeContent) public pure returns (Outcome.Guarantee memory) {
      return Outcome.toGuarantee(outcomeContent);
    }
}
