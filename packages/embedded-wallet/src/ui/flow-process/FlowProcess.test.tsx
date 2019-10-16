import Enzyme, {mount, ReactWrapper} from 'enzyme';
import Adapter from 'enzyme-adapter-react-16';
import React from 'react';
import {FlowProcess} from './FlowProcess';

Enzyme.configure({adapter: new Adapter()});

type MockFlowProcess = {
  flowProcessWrapper: ReactWrapper;
  flowProcessElement: ReactWrapper;
};

const mockFlowProcess = () => {
  const flowProcessWrapper = mount(<FlowProcess />);

  return {
    flowProcessWrapper,
    flowProcessElement: flowProcessWrapper.find('ol')
  };
};

describe('UI - FlowProcess', () => {
  let component: MockFlowProcess;

  beforeEach(() => {
    component = mockFlowProcess();
  });

  it('can be instantiated', () => {
    const {flowProcessElement} = component;
    expect(flowProcessElement.exists()).toEqual(true);
    expect(flowProcessElement.prop('role')).toEqual('progressbar');
    expect(flowProcessElement.prop('aria-atomic')).toEqual(true);
  });
});
