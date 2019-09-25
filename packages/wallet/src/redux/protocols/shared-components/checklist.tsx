import { faCircle } from '@fortawesome/free-regular-svg-icons';
import { faCheckCircle, faSpinner } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import React from 'react';

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

export const icon = (iconStep: number, currentStep: number) => {
  if (currentStep < iconStep) {
    return todoIcon;
  } else if (currentStep === iconStep) {
    return inProgressIcon;
  } else {
    return completeIcon;
  }
};

export interface MessagesForStep {
  preStep: string;
  step: string;
  postStep: string;
}

export const messagesForStep = (
  preStep: string,
  step: string,
  postStep: string,
): MessagesForStep => {
  return { preStep, step, postStep };
};

export const message = (messageForStep: MessagesForStep, iconStep: number, currentStep: number) => {
  if (currentStep < iconStep) {
    return messageForStep.preStep;
  }
  if (currentStep === iconStep) {
    return messageForStep.step;
  } else {
    return messageForStep.postStep;
  }
};

interface Props {
  step: number;
  stepMessages: MessagesForStep[];
  title: string;
}

export class Checklist extends React.PureComponent<Props> {
  render() {
    const currentStep = this.props.step;
    const stepMessages = this.props.stepMessages;
    const children = this.props.children;
    const title = this.props.title;

    return (
      <div>
        <h2 className="bp-2">{title}</h2>
        <ul className="fa-ul">
          {this.props.stepMessages.map((step, stepIndex) => (
            <li key={stepIndex}>
              {icon(stepIndex, currentStep)}
              {message(stepMessages[stepIndex], stepIndex, currentStep)}
            </li>
          ))}
        </ul>
        <div className="pb-2">{children}</div>
      </div>
    );
  }
}
