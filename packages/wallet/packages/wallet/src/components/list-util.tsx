import { faCheckCircle, faCircle, faSpinner } from '@fortawesome/free-solid-svg-icons';
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

export const message = (messages: MessagesForStep[], iconStep: number, currentStep: number) => {
  const messageForStep = messages[currentStep];
  if (currentStep < iconStep) {
    return messageForStep.preStep;
  }
  if (currentStep === iconStep) {
    return messageForStep.step;
  } else {
    return messageForStep.postStep;
  }
};
