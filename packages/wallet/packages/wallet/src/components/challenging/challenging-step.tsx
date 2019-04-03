import React from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faCheckCircle,
  faSpinner,
  faHourglassEnd,
  faHourglassHalf,
  faHourglassStart,
  faBullhorn,
} from '@fortawesome/free-solid-svg-icons';
import { faCircle } from '@fortawesome/free-regular-svg-icons';
import SidebarLayout from '../sidebar-layout';

interface Props {
  step: number;
  expirationTime: number;
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

const timeReadyIcon = (
  <span className="fa-li">
    <FontAwesomeIcon icon={faHourglassStart} size="lg" />
  </span>
);

const timeRunningIcon = (
  <span className="fa-li">
    <FontAwesomeIcon icon={faHourglassHalf} size="lg" pulse={true} />
  </span>
);

const timeOutIcon = (
  <span className="fa-li">
    <FontAwesomeIcon icon={faHourglassEnd} size="lg" color="green" />
  </span>
);

const responseIcon = (
  <span className="fa-li">
    <FontAwesomeIcon icon={faBullhorn} size="lg" color="red" />
  </span>
);

const icon = (iconStep: number, currentStep: number) => {
  if (iconStep < 3) {
    if (currentStep < iconStep) {
      return todoIcon;
    } else if (currentStep === iconStep) {
      return inProgressIcon;
    } else {
      return completeIcon;
    }
  } else {
    if (currentStep < iconStep) {
      return timeReadyIcon;
    } else if (currentStep === iconStep) {
      return timeRunningIcon;
    } else if (currentStep === 777) {
      return responseIcon;
    } else if (currentStep === 999) {
      return timeOutIcon;
    } else {
      return;
    }
  }
};

// NOTE: the appearance of this modal is largely influenced by the amount of text in each message. Until a more robust front-end comes along, try to keep messages of the same length within each case block below.
const message = (iconStep: number, currentStep: number) => {
  switch (iconStep) {
    case 1:
      if (currentStep < iconStep) {
        return 'Send your transaction';
      } else if (currentStep === iconStep) {
        return 'Preparing your transaction...';
      } else {
        return 'Challenge transaction sent';
      }
    case 2:
      if (currentStep < iconStep) {
        return 'Transaction will be confirmed';
      } else if (currentStep === iconStep) {
        return 'Waiting for confirmation...';
      } else {
        return 'Transaction confirmed';
      }
    case 3:
      if (currentStep < iconStep) {
        return 'Challenge period will begin';
      } else if (currentStep === iconStep) {
        return 'Wait for response or timeout...';
      } else if (currentStep === 777) {
        return 'Opponent responded!';
      } else if (currentStep === 999) {
        return 'Challenge timed out!';
      } else {
        return '';
      }
    default:
      return '';
  }
};

export class ChallengingStep extends React.PureComponent<Props> {
  render() {
    const currentStep = this.props.step;
    const children = this.props.children;
    const expiryDate = new Date(this.props.expirationTime * 1000)
      .toLocaleTimeString()
      .replace(/:\d\d /, ' ');
    const CHALLENGE_PERIOD_MESSAGE =
      "If they don't respond by " +
      expiryDate +
      ', the channel will be closed and you can withdraw your funds.';
    return (
      <SidebarLayout>
        <h2 className="bp-2">Challenging</h2>
        <ul className="fa-ul">
          <li style={{ padding: '0.7em 1em' }}>
            {icon(1, currentStep)}
            {message(1, currentStep)}
          </li>
          <li style={{ padding: '0.7em 1em' }}>
            {icon(2, currentStep)}
            {message(2, currentStep)}
          </li>
          <li style={{ padding: '0.7em 1em' }}>
            {icon(3, currentStep)}
            {message(3, currentStep)}
          </li>
        </ul>
        <div className="pb-2">
          {children}
          {currentStep === 3 ? CHALLENGE_PERIOD_MESSAGE : null}
        </div>
      </SidebarLayout>
    );
  }
}
