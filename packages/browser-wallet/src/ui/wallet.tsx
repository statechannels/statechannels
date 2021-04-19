import React from 'react';
import {Interpreter} from 'xstate';
import {useService} from '@xstate/react';
import {RichObjective, RichObjectiveEvent} from '@statechannels/wallet-core';

import {WindowContext} from './window-context';
import './wallet.scss';
import {ApplicationWorkflow} from './workflows/application-workflow';
import {EnableEthereum} from './workflows/enable-ethereum-workflow';
import {Layout} from './layout';
import {ApproveBudgetAndFund} from './workflows/approve-budget-and-fund-workflow';
import {CloseLedgerAndWithdraw} from './workflows/close-ledger-and-withdraw';
import {Objective} from './objective/objective';
import {ObjectiveContext} from './objective/objective-context';

interface Props {
  workflow?: Interpreter<any, any, any>;
  // TODO: generalize to all rich objectives
  objective?: RichObjective;
  triggerObjectiveEvent(event: RichObjectiveEvent): void;
}

export const Wallet = (props: Props) => {
  if (props.workflow) {
    const [current, send] = useService(props.workflow);
    return (
      <WindowContext.Provider value={window}>
        <Layout>
          {props.workflow.id === 'application-workflow' && (
            <ApplicationWorkflow current={current} />
          )}
          {props.workflow.id === 'enable-ethereum' && (
            <EnableEthereum current={current} send={send} />
          )}
          {props.workflow.id === 'approve-budget-and-fund' && (
            <ApproveBudgetAndFund service={props.workflow} />
          )}
          {props.workflow.id === 'close-and-withdraw' && (
            <CloseLedgerAndWithdraw service={props.workflow} />
          )}
        </Layout>
      </WindowContext.Provider>
    );
  } else if (props.objective) {
    return (
      <ObjectiveContext.Provider value={props.triggerObjectiveEvent}>
        <Layout>
          <Objective objective={props.objective} />
        </Layout>
        ;
      </ObjectiveContext.Provider>
    );
  } else {
    throw new Error('A wallet renders an objective or a workflow. Neither has been supplied.');
  }
};
