import React from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faCheckCircle, faSpinner } from '@fortawesome/free-solid-svg-icons';
import { faCircle } from '@fortawesome/free-regular-svg-icons';
import SidebarLayout from '../SidebarLayout';

interface Props { 
  step: number;
 }

const completeIcon = (
  <span className="fa-li" ><FontAwesomeIcon icon={faCheckCircle} color="green" size="lg" /></span>
);
const inProgressIcon = (
  <span className="fa-li" ><FontAwesomeIcon icon={faSpinner} pulse={true} size="lg" /></span>
);
const todoIcon = (
  <span className="fa-li" ><FontAwesomeIcon icon={faCircle} size="lg" /></span>
);

const icon = (iconStep:number, currentStep:number) => {
  if (currentStep < iconStep) {
    return todoIcon;
  } else if (currentStep === iconStep) {
    return inProgressIcon;
  } else {
    return completeIcon;
  }
};

// NOTE: the appearance of this modal is largely influenced by the amount of text in each message. Until a more robust front-end comes along, try to keep messages of the same length within each case block below.
const message = (iconStep: number, currentStep: number) => {
  switch (iconStep){
    case 1:
      if (currentStep < iconStep) {
        return "Prepare your transaction";
      } else if (currentStep === iconStep) {
        return "Preparing your transaction...";
      } else {
        return "Withdrawal transaction sent";
      }
    case 2:
      if (currentStep < iconStep) {
        return "Transaction will be confirmed";
      } else if (currentStep === iconStep) {
        return "Waiting for confirmation...";
      } else {
        return "Transaction confirmed";
      }
    case 3:
      if (currentStep < iconStep) {
        return "Withdrawal will be confirmed";
      } else if (currentStep === iconStep) {
        return "Waiting for confirmation...";
      } else {
        return "Withdrawal successful!";
      }
    default:
      return "";
  }
};


export class WithdrawingStep extends React.PureComponent<Props> {
  render() {
    const currentStep = this.props.step;
    const children = this.props.children;

    return (
      <SidebarLayout>
        <h2 className="bp-2">Closing channel</h2>
        <ul className="fa-ul">
          <li style={{ padding: "0.7em 1em" }}>
            {icon(1, currentStep)}
            {message(1,currentStep)}
          </li>
          <li style={{ padding: "0.7em 1em" }}>
            {icon(2, currentStep)}
            {message(2,currentStep)}
          </li>
          <li style={{ padding: "0.7em 1em" }}>
            {icon(3, currentStep)}
            {message(3,currentStep)}
          </li>
        </ul>
        <div className="pb-2">
          {children}
        </div>
      </SidebarLayout>
    );
  }
}
