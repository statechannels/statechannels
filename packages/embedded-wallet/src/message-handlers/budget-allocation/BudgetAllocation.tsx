import debug from "debug";
import React, { useState } from "react";
import { JsonRpcComponentProps } from "../../json-rpc-router";
import { closeWallet } from "../../message-dispatchers";
import { Dialog, Slider } from "../../ui";

const log = debug("wallet:budget-allocation");

const allow = (amountToAllocate: number) => () => {
  log("`Allow` clicked: I'll allow it, with %o ETH", amountToAllocate);
};

const reject = () => {
  log("`Reject` clicked: You shall not pass.");
};

const BudgetAllocation: React.FC<JsonRpcComponentProps> = () => {
  const [amountToAllocate, setAmountToAllocate] = useState<number>(0.2);

  return (
    <Dialog
      title="statechannels.com want to allocate"
      onClose={closeWallet}
      buttons={{
        primary: { label: "Allow", onClick: allow(amountToAllocate) },
        secondary: { label: "Reject", onClick: reject }
      }}
    >
      <div>
        Recommended amount: <strong>0.2 ETH</strong> of your send.
      </div>
      <Slider initialValue={0.2} min={0} max={2} unit="ETH" step={0.01} onChange={setAmountToAllocate} />
    </Dialog>
  );
};

export { BudgetAllocation };
