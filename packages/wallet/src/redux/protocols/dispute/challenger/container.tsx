import React from "react";
import {PureComponent} from "react";
import {connect} from "react-redux";
import {NonTerminalChallengerState, FailureReason} from "./states";
import {unreachable} from "../../../../utils/reducer-utils";
import * as actions from "./actions";
import {TransactionSubmission} from "../../transaction-submission";
import Acknowledge from "../../shared-components/acknowledge";
import WaitForResponseOrTimeout from "./components/wait-for-response-or-timeout";
import {ActionDispatcher} from "../../../utils";
import {closeLedgerChannel} from "../../actions";
import {multipleWalletActions} from "../../../../redux/actions";
import ApproveX from "../../shared-components/approve-x";

interface Props {
  state: NonTerminalChallengerState;
  approve: ActionDispatcher<actions.ChallengeApproved>;
  deny: ActionDispatcher<actions.ChallengeDenied>;
  acknowledged: ActionDispatcher<actions.Acknowledged>;
  defund: typeof closeLedgerChannelAndExitChallenge;
}

class ChallengerContainer extends PureComponent<Props> {
  render() {
    const {state, deny, approve, acknowledged, defund} = this.props;
    const processId = state.processId;
    switch (state.type) {
      case "Challenging.ApproveChallenge":
        return (
          <ApproveX
            title={"Approve challenge"}
            description={
              "Did you want to launch a challenge on the blockchain? Launching a challenge will take time and cost a small amount but will allow you to reclaim your funds if there is no response from your opponent."
            }
            noMessage={"Deny"}
            rejectionAction={() => deny({processId})}
            yesMessage={"Approve"}
            approvalAction={() => approve({processId})}
          />
        );
      case "Challenging.WaitForTransaction":
        return (
          <TransactionSubmission transactionName="challenge" state={state.transactionSubmission} />
        );
      case "Challenging.WaitForResponseOrTimeout":
        return <WaitForResponseOrTimeout expirationTime={state.expiryTime} />;
      case "Challenging.AcknowledgeResponse":
        return (
          <Acknowledge
            title="Opponent responded!"
            description="Your opponent responded to your challenge. You can now continue with your application."
            acknowledge={() => acknowledged({processId})}
          />
        );
      case "Challenging.AcknowledgeTimeout":
        return (
          <ApproveX
            title={"Challenge timed out!"}
            description={""}
            yesMessage={"Defund"}
            approvalAction={() => defund(processId, state.channelId)}
            noMessage={"No"}
            rejectionAction={() => acknowledged({processId})}
          >
            <div>
              The challenge timed out. Channel
              <div className="channel-address">{state.channelId}</div>
              is now finalized -- would you like to defund it?
            </div>
          </ApproveX>
        );
      case "Challenging.AcknowledgeFailure":
        const description = describeFailure(state.reason);

        return (
          <Acknowledge
            title="Challenge not possible"
            description={description}
            acknowledge={() => acknowledged({processId})}
          />
        );
      default:
        return unreachable(state);
    }
  }
}

function describeFailure(reason: FailureReason): string {
  switch (reason) {
    case "AlreadyHaveLatest":
      return "Your opponent has already sent you their latest state.";
    case "ChannelDoesNotExist":
      return "The channel doesn't exist.";
    case "DeclinedByUser":
      return "The challenge failed because you cancelled it.";
    case "LatestWhileApproving":
      return "Your opponent's move arrived while you were approving the challenge, so there's no need to challenge anymore";
    case "NotFullyOpen":
      return "The channel that you're launching the challenge on isn't fully open.";
    case "TransactionFailed":
      return "The blockchain transaction failed.";
    default:
      return unreachable(reason);
  }
}

function closeLedgerChannelAndExitChallenge(processId, channelId) {
  return multipleWalletActions({
    actions: [closeLedgerChannel({channelId}), actions.exitChallenge({processId})]
  });
}

const mapDispatchToProps = {
  approve: actions.challengeApproved,
  deny: actions.challengeDenied,
  acknowledged: actions.acknowledged,
  defund: closeLedgerChannelAndExitChallenge
};

export const Challenger = connect(() => ({}), mapDispatchToProps)(ChallengerContainer);
