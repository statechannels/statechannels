import React from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faCheckCircle, faSpinner } from '@fortawesome/free-solid-svg-icons';
import { faCircle } from '@fortawesome/free-regular-svg-icons';
import StatusBarLayout from '../status-bar-layout';

interface Props {
  step: number;
}

const completeIcon = (
  <span className="fa-li">
    <FontAwesomeIcon icon={faCheckCircle} color="green" size="lg" />
  </span>
);
const inProgressIcon = (
  <span className="fa-li">
    <FontAwesomeIcon icon={faSpinner} pulse={true} size="lg" />
  </span>
);
const todoIcon = (
  <span className="fa-li">
    <FontAwesomeIcon icon={faCircle} size="lg" />
  </span>
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

export class ClosingStep extends React.PureComponent<Props> {
  render() {
    const currentStep = this.props.step;
    const children = this.props.children;

    return (
      <StatusBarLayout>
        <h2 className="bp-2">Closing channel</h2>
        <ul className="fa-ul">
          <li>
            {icon(1, currentStep)}
            Preparing your close transaction
          </li>
          <li>
            {icon(2, currentStep)}
            Wait for confirmation
          </li>
          <li>
            {icon(3, currentStep)}
            Close and Withdrawal Successful!
          </li>
        </ul>
        <div className="pb-2">{children}</div>
      </StatusBarLayout>
    );
  }
}
