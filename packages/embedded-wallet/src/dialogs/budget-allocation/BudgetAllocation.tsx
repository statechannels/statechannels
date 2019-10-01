import debug from 'debug';
import React, {Dispatch, SetStateAction, useState} from 'react';
import {Redirect, RouteComponentProps} from 'react-router';
import {OnboardingFlowPaths} from '../../flows';
import {JsonRpcComponentProps} from '../../json-rpc-router';
import {closeWallet} from '../../message-dispatchers';
import {Dialog, Slider} from '../../ui';
const log = debug('wallet:budget-allocation');

const allow = (amountToAllocate: number, useRedirect: Dispatch<SetStateAction<boolean>>) => () => {
  log("`Allow` clicked: I'll allow it, with %o ETH", amountToAllocate);
  log('Handing off to NoHub');
  useRedirect(true);
};

const reject = () => {
  log('`Reject` clicked: You shall not pass.');
};

const BudgetAllocation: React.FC<JsonRpcComponentProps & RouteComponentProps> = () => {
  const [amountToAllocate, setAmountToAllocate] = useState<number>(0.2);
  const [redirect, useRedirect] = useState<boolean>(false);

  return (
    <Dialog
      title="statechannels.com want to allocate"
      onClose={closeWallet}
      buttons={{
        primary: {label: 'Allow', onClick: allow(amountToAllocate, useRedirect)},
        secondary: {label: 'Reject', onClick: reject}
      }}
    >
      {redirect ? <Redirect to={OnboardingFlowPaths.NoHub} /> : []}
      <div>
        Recommended amount: <strong>0.2 ETH</strong> of your send.
      </div>
      <Slider
        initialValue={0.2}
        min={0}
        max={2}
        unit="ETH"
        step={0.01}
        onChange={setAmountToAllocate}
      />
    </Dialog>
  );
};

export {BudgetAllocation};
