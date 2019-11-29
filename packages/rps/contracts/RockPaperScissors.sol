pragma solidity ^0.5.11;
pragma experimental ABIEncoderV2;

import '@statechannels/nitro-protocol/contracts/interfaces/ForceMoveApp.sol';
import '@statechannels/nitro-protocol/contracts/Outcome.sol';
import 'openzeppelin-solidity/contracts/math/SafeMath.sol';

/**
  * @dev The RockPaperScissors contract complies with the ForceMoveApp interface and implements a commit-reveal game of Rock Paper Scissors (henceforth RPS).
  * The following transitions are allowed:
  *
  * Start -> RoundProposed  [ PROPOSE ]
  * RoundProposed -> Start  [ REJECT ]
  * RoundProposed -> RoundAccepted [ ACCEPT ]
  * RoundAccepted -> Reveal [ REVEAL ]
  * Reveal -> Start [ FINISH ]
  *
*/
contract RockPaperScissors is ForceMoveApp {
    using SafeMath for uint256;

    enum PositionType {Start, RoundProposed, RoundAccepted, Reveal}
    enum Weapon {Rock, Paper, Scissors}

    struct RPSData {
        PositionType positionType;
        uint256 stake;
        bytes32 preCommit;
        Weapon aWeapon; // playerOneWeapon
        Weapon bWeapon; // playerTwoWeapon
        bytes32 salt;
    }

    /**
    * @notice Decodes the appData.
    * @dev Decodes the appData.
    * @param appDataBytes The abi.encode of a RPSData struct describing the application-specific data.
    * @return An RPSData struct containing the application-specific data.
    */
    function appData(bytes memory appDataBytes) internal pure returns (RPSData memory) {
        return abi.decode(appDataBytes, (RPSData));
    }

    /**
    * @notice Encodes the RPS update rules.
    * @dev Encodes the RPS update rules.
    * @param fromPart State being transitioned from.
    * @param toPart State being transitioned to.
    * @return true if the transition conforms to the rules, false otherwise.
    */
    function validTransition(
        VariablePart memory fromPart,
        VariablePart memory toPart,
        uint256, /* turnNumB */
        uint256  /* nParticipants */
    ) public pure returns (bool) {
        Outcome.AllocationItem[] memory fromAllocation = extractAllocation(fromPart);
        Outcome.AllocationItem[] memory toAllocation = extractAllocation(toPart);
        _requireDestinationsUnchanged(fromAllocation, toAllocation);
        // decode application-specific data
        RPSData memory fromGameData = appData(fromPart.appData);
        RPSData memory toGameData = appData(toPart.appData);

        // deduce action
        if (fromGameData.positionType == PositionType.Start) {
            require(
                toGameData.positionType == PositionType.RoundProposed,
                'Start may only transition to RoundProposed'
            );
            requireValidPROPOSE(
                fromPart,
                toPart,
                fromAllocation,
                toAllocation,
                fromGameData,
                toGameData
            );
            return true;
        } else if (fromGameData.positionType == PositionType.RoundProposed) {
            if (toGameData.positionType == PositionType.Start) {
                requireValidREJECT(fromAllocation, toAllocation, fromGameData, toGameData);
                return true;
            } else if (toGameData.positionType == PositionType.RoundAccepted) {
                requireValidACCEPT(fromAllocation, toAllocation, fromGameData, toGameData);
                return true;
            }
            revert('Proposed may only transition to Start or RoundAccepted');
        } else if (fromGameData.positionType == PositionType.RoundAccepted) {
            require(
                toGameData.positionType == PositionType.Reveal,
                'RoundAccepted may only transition to Reveal'
            );
            requireValidREVEAL(fromAllocation, toAllocation, fromGameData, toGameData);
            return true;
        } else if (fromGameData.positionType == PositionType.Reveal) {
            require(
                toGameData.positionType == PositionType.Start,
                'Reveal may only transition to Start'
            );
            requireValidFINISH(fromAllocation, toAllocation, fromGameData, toGameData);
            return true;
        }
        revert('No valid transition found');
    }

    // action requirements

    function requireValidPROPOSE(
        VariablePart memory fromPart,
        VariablePart memory toPart,
        Outcome.AllocationItem[] memory fromAllocation,
        Outcome.AllocationItem[] memory toAllocation,
        RPSData memory fromGameData,
        RPSData memory toGameData
    )
        private
        pure
        outcomeUnchanged(fromPart, toPart)
        stakeUnchanged(fromGameData, toGameData)
        allocationsNotLessThanStake(fromAllocation, toAllocation, fromGameData, toGameData)
    {}

    function requireValidREJECT(
        Outcome.AllocationItem[] memory fromAllocation,
        Outcome.AllocationItem[] memory toAllocation,
        RPSData memory fromGameData,
        RPSData memory toGameData
    )
        private
        pure
        allocationUnchanged(fromAllocation, toAllocation)
        stakeUnchanged(fromGameData, toGameData)
    {}

    function requireValidACCEPT(
        Outcome.AllocationItem[] memory fromAllocation,
        Outcome.AllocationItem[] memory toAllocation,
        RPSData memory fromGameData,
        RPSData memory toGameData
    ) private pure stakeUnchanged(fromGameData, toGameData) {
        require(fromGameData.preCommit == toGameData.preCommit, 'Precommit should be the same.');

        // a will have to reveal, so remove the stake beforehand
        require(
            toAllocation[0].amount == fromAllocation[0].amount.sub(toGameData.stake),
            'Allocation for player A should be decremented by 1x stake'
        );
        require(
            toAllocation[1].amount == fromAllocation[1].amount.add(toGameData.stake),
            'Allocation for player B should be incremented by 1x stake.'
        );

    }

    function requireValidREVEAL(
        Outcome.AllocationItem[] memory fromAllocation,
        Outcome.AllocationItem[] memory toAllocation,
        RPSData memory fromGameData,
        RPSData memory toGameData
    ) private pure {
        uint256 playerAWinnings; // playerOneWinnings
        uint256 playerBWinnings; // playerTwoWinnings
        require(
            toGameData.bWeapon == fromGameData.bWeapon,
            "Player Second's weapon should be the same between commitments."
        );

        // check hash matches
        // need to convert Weapon -> uint256 to get hash to work
        bytes32 hashed = keccak256(abi.encode(uint256(toGameData.aWeapon), toGameData.salt));
        require(hashed == fromGameData.preCommit, 'The hash needs to match the precommit');

        // calculate winnings
        (playerAWinnings, playerBWinnings) = winnings(
            toGameData.aWeapon,
            toGameData.bWeapon,
            toGameData.stake
        );

        require(
            toAllocation[0].amount == fromAllocation[0].amount.add(playerAWinnings),
            "Player A's allocation should be updated with the winnings."
        );
        require(
            toAllocation[1].amount ==
                fromAllocation[1].amount.sub(fromGameData.stake.mul(2)).add(playerBWinnings),
            "Player B's allocation should be updated with the winnings."
        );
    }

    function requireValidFINISH(
        Outcome.AllocationItem[] memory fromAllocation,
        Outcome.AllocationItem[] memory toAllocation,
        RPSData memory fromGameData,
        RPSData memory toGameData
    )
        private
        pure
        allocationUnchanged(fromAllocation, toAllocation)
        stakeUnchanged(fromGameData, toGameData)
    {}

    function extractAllocation(VariablePart memory variablePart)
        private
        pure
        returns (Outcome.AllocationItem[] memory)
    {
        Outcome.OutcomeItem[] memory outcome = abi.decode(variablePart.outcome, (Outcome.OutcomeItem[]));
        require(outcome.length == 1, 'RockPaperScissors: Only one asset allowed');

        Outcome.AssetOutcome memory assetOutcome = abi.decode(
            outcome[0].assetOutcomeBytes,
            (Outcome.AssetOutcome)
        );

        require(
            assetOutcome.assetOutcomeType == uint8(Outcome.AssetOutcomeType.Allocation),
            'RockPaperScissors: AssetOutcomeType must be Allocation'
        );

        Outcome.AllocationItem[] memory allocation = abi.decode(
            assetOutcome.allocationOrGuaranteeBytes,
            (Outcome.AllocationItem[])
        );

        require(
            allocation.length == 2,
            'RockPaperScissors: Allocation length must equal number of participants (i.e. 2)'
        );

        return allocation;
    }

    function winnings(Weapon aWeapon, Weapon bWeapon, uint256 stake)
        private
        pure
        returns (uint256, uint256)
    {
        if (aWeapon == bWeapon) {
            return (stake, stake);
        } else if ((aWeapon == Weapon.Rock && bWeapon == Weapon.Scissors) || (aWeapon > bWeapon)) {
            // first player won
            return (2 * stake, 0);
        } else {
            // second player won
            return (0, 2 * stake);
        }
    }

    function _requireDestinationsUnchanged(
        Outcome.AllocationItem[] memory fromAllocation,
        Outcome.AllocationItem[] memory toAllocation
    ) private pure {
        require(
            toAllocation[0].destination == fromAllocation[0].destination,
            'RockPaperScissors: Destimation playerA may not change'
        );
        require(
            toAllocation[1].destination == fromAllocation[1].destination,
            'RockPaperScissors: Destimation playerB may not change'
        );
    }

    // modifiers
    modifier outcomeUnchanged(VariablePart memory a, VariablePart memory b) {
        require(
            keccak256(b.outcome) == keccak256(a.outcome),
            'RockPaperScissors: Outcome must not change'
        );
        _;
    }

    modifier stakeUnchanged(RPSData memory fromGameData, RPSData memory toGameData) {
        require(
            fromGameData.stake == toGameData.stake,
            'The stake should be the same between commitments'
        );
        _;
    }

    modifier allocationsNotLessThanStake(
        Outcome.AllocationItem[] memory fromAllocation,
        Outcome.AllocationItem[] memory toAllocation,
        RPSData memory fromGameData,
        RPSData memory toGameData
    ) {
        require(
            fromAllocation[0].amount >= toGameData.stake,
            'The allocation for player A must not fall below the stake.'
        );
        require(
            fromAllocation[1].amount >= toGameData.stake,
            'The allocation for player B must not fall below the stake.'
        );
        _;
    }

    modifier allocationUnchanged(
        Outcome.AllocationItem[] memory fromAllocation,
        Outcome.AllocationItem[] memory toAllocation
    ) {
        require(
            toAllocation[0].destination == fromAllocation[0].destination,
            'RockPaperScissors: Destimation playerA may not change'
        );
        require(
            toAllocation[1].destination == fromAllocation[1].destination,
            'RockPaperScissors: Destimation playerB may not change'
        );
        require(
            toAllocation[0].amount == fromAllocation[0].amount,
            'RockPaperScissors: Amount playerA may not change'
        );
        require(
            toAllocation[1].amount == fromAllocation[1].amount,
            'RockPaperScissors: Amount playerB may not change'
        );
        _;
    }
}