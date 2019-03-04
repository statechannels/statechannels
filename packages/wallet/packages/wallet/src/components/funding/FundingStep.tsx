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

const icon = (iconStep: number, currentStep: number) => {
  if (currentStep < iconStep) {
    return todoIcon;
  } else if (currentStep === iconStep) {
    return inProgressIcon;
  } else {
    return completeIcon;
  }
};

// NOTE: the appearance of this modal is largely influenced by the amount of text in each message. Until a more robust front-end comes along, try to keep messages of the same length within each case block below.
const aMessage = (iconStep: number, currentStep: number) => {
  switch (iconStep){
    case 1:
      if (currentStep < iconStep) {
        return "Send your deposit";
      } else if (currentStep === iconStep) {
        return "Sending your deposit...";
      } else {
        return "Deposit sent";
      }
    case 2:
      if (currentStep < iconStep) {
        return "Your deposit will be confirmed";
      } else if (currentStep === iconStep) {
        return "Waiting for confirmation...";
      } else {
        return "Deposit confirmed";
      }
    case 3:
      if (currentStep < iconStep) {
        return "Opponent's deposit will be confirmed";
      } else if (currentStep === iconStep) {
        return "Waiting for opponent's deposit...";
      } else {
        return "Opponent deposit has been confirmed";
      }
    case 4:
      if (currentStep < iconStep) {
        return "The channel will be opened";
      } else if (currentStep === iconStep) {
        return "Opening channel...";
      } else {
        return "Channel open!";
      }
    default:
      return "";
  }
};

const bMessage = (iconStep: number, currentStep: number) => {
  switch (iconStep){
    case 1:
      if (currentStep < iconStep) {
        return "Opponent's deposit will be confirmed";
      } else if (currentStep === iconStep) {
        return "Waiting for opponent's deposit...";
      } else {
        return "Opponent deposit has been confirmed";
      }
    case 2:
      if (currentStep < iconStep) {
        return "Send your deposit";
      } else if (currentStep === iconStep) {
        return "Sending your deposit...";
      } else {
        return "Deposit sent";
      }
    case 3:
      if (currentStep < iconStep) {
        return "Your deposit will be confirmed";
      } else if (currentStep === iconStep) {
        return "Waiting for confirmation...";
      } else {
        return "Deposit confirmed";
      }
    case 4:
      if (currentStep < iconStep) {
        return "The channel will be opened";
      } else if (currentStep === iconStep) {
        return "Opening channel...";
      } else {
        return "Channel open!";
      }
    default:
      return "";
  }
};


export class AFundingStep extends React.PureComponent<Props> {
  render() {
    const currentStep = this.props.step;
    const children = this.props.children;

    return (
      <SidebarLayout>
        <h2 className="bp-2">Opening channel</h2>
        <ul className="fa-ul">
          <li style={{ padding: "0.7em 1em" }}>
            {icon(1, currentStep)}
            {aMessage(1,currentStep)}
          </li>
          <li style={{ padding: "0.7em 1em" }}>
            {icon(2, currentStep)}
            {aMessage(2,currentStep)}
          </li>
          <li style={{ padding: "0.7em 1em" }}>
            {icon(3, currentStep)}
            {aMessage(3,currentStep)}
          </li>
          <li style={{ padding: "0.7em 1em" }}>
            {icon(4, currentStep)}
            {aMessage(4,currentStep)}
          </li>
        </ul>
        <div className="pb-2">
          {children}
        </div>
      </SidebarLayout>
    );
  }
}

export class BFundingStep extends React.PureComponent<Props> {
  render() {
    const currentStep = this.props.step;
    const children = this.props.children;

    return (
      <SidebarLayout>
        <h2 className="bp-2">Opening channel</h2>
        <ul className="fa-ul">
          <li style={{ padding: "0.7em 1em" }}>
            {icon(1, currentStep)}
            {bMessage(1,currentStep)}
          </li>
          <li style={{ padding: "0.7em 1em" }}>
            {icon(2, currentStep)}
            {bMessage(2,currentStep)}
          </li>
          <li style={{ padding: "0.7em 1em" }}>
            {icon(3, currentStep)}
            {bMessage(3,currentStep)}
          </li>
          <li style={{ padding: "0.7em 1em" }}>
            {icon(4, currentStep)}
            {bMessage(4,currentStep)}
          </li>
        </ul>
        <div className="pb-2">
          {children}
        </div>
      </SidebarLayout>
    );
  }
}

