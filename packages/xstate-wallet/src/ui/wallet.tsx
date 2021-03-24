import React from 'react';
import {WindowContext} from './window-context';
import {Interpreter} from 'xstate';
import {useService} from '@xstate/react';
import './wallet.scss';
import {ApplicationWorkflow} from './application-workflow';
import {EnableEthereum} from './enable-ethereum-workflow';
import {Layout} from './layout';
import {ApproveBudgetAndFund} from './approve-budget-and-fund-workflow';

import {CloseLedgerAndWithdraw} from './close-ledger-and-withdraw';

interface Props {
  workflow: Interpreter<any, any, any>;
}

export const Wallet = (props: Props) => {
  const [current, send] = useService(props.workflow);
  return (
    <WindowContext.Provider value={window}>
      <Layout>
        {props.workflow.id === 'application-workflow' && <ApplicationWorkflow current={current} />}
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
};
