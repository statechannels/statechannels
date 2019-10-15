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
    expect(component.stepElement.exists()).toEqual(true);
    expect(component.titleElement.exists()).toEqual(true);
    expect(component.statusWrapper.exists()).toEqual(true);
    expect(component.statusIconElement.exists()).toEqual(true);
    expect(component.statusSpinnerElement.exists()).toEqual(false);
  });

  it('can show an Hourglass icon when the status is Pending', () => {
    expect(component.statusIconElement.prop('name')).toEqual(Icons.Hourglass);
  });

  it('can show a Spinner when the status is In Progress', () => {
    component = mockFlowStep({status: FlowStepStatus.InProgress});
    expect(component.statusIconElement.exists()).toEqual(false);
    expect(component.statusSpinnerElement.exists()).toEqual(true);
    expect(component.stepElement.hasClass(css.inProgress)).toEqual(true);
  });

  it('can show a Check icon when status is Done', () => {
    component = mockFlowStep({status: FlowStepStatus.Done});
    expect(component.statusIconElement.prop('name')).toEqual(Icons.Check);
    expect(component.statusIconElement.exists()).toEqual(true);
    expect(component.statusSpinnerElement.exists()).toEqual(false);
  });
});
