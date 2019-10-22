import Enzyme, {mount, ReactWrapper} from 'enzyme';
import Adapter from 'enzyme-adapter-react-16';
import React from 'react';
import {Icon, IconProps, Icons} from '../icon/Icon';
import {Spinner} from '../spinner/Spinner';
import {FlowStep, FlowStepProps, FlowStepStatus} from './FlowStep';
import css from './FlowStep.module.css';

Enzyme.configure({adapter: new Adapter()});

type MockFlowStep = {
  flowStepWrapper: ReactWrapper;
  stepElement: ReactWrapper;
  statusWrapper: ReactWrapper;
  statusIconElement: ReactWrapper<IconProps>;
  statusSpinnerElement: ReactWrapper;
  titleElement: ReactWrapper;
};

const mockFlowStep = (props?: Partial<FlowStepProps>): MockFlowStep => {
  const flowStepWrapper = mount(
    <FlowStep title="Step 1" status={FlowStepStatus.Pending} {...props} />
  );

  return {
    flowStepWrapper,
    stepElement: flowStepWrapper.find('li'),
    statusWrapper: flowStepWrapper.find(`span.${css.stepStatus}`),
    statusIconElement: flowStepWrapper.find(Icon),
    statusSpinnerElement: flowStepWrapper.find(Spinner),
    titleElement: flowStepWrapper.find(`label.${css.stepTitle}`)
  };
};

describe('UI - FlowStep', () => {
  let component: MockFlowStep;

  beforeEach(() => {
    component = mockFlowStep();
  });

  it('can be instantiated', () => {
    const {
      stepElement,
      titleElement,
      statusWrapper,
      statusIconElement,
      statusSpinnerElement
    } = component;
    expect(stepElement.exists()).toEqual(true);
    expect(titleElement.exists()).toEqual(true);
    expect(statusWrapper.exists()).toEqual(true);
    expect(statusIconElement.exists()).toEqual(true);
    expect(statusSpinnerElement.exists()).toEqual(false);
  });

  it('can show an Hourglass icon when the status is Pending', () => {
    expect(component.statusIconElement.prop('name')).toEqual(Icons.Hourglass);
  });

  it('can show a Spinner when the status is In Progress', () => {
    const {statusIconElement, statusSpinnerElement, stepElement} = mockFlowStep({
      status: FlowStepStatus.InProgress
    });
    expect(statusIconElement.exists()).toEqual(false);
    expect(statusSpinnerElement.exists()).toEqual(true);
    expect(stepElement.hasClass(css.inProgress)).toEqual(true);
  });

  it('can show a Check icon when status is Done', () => {
    const {statusIconElement, statusSpinnerElement} = mockFlowStep({status: FlowStepStatus.Done});
    expect(statusIconElement.prop('name')).toEqual(Icons.Check);
    expect(statusIconElement.exists()).toEqual(true);
    expect(statusSpinnerElement.exists()).toEqual(false);
  });
});
