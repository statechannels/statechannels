import Enzyme, {mount, ReactWrapper} from 'enzyme';
import Adapter from 'enzyme-adapter-react-16';
import React from 'react';
import {Spinner} from './Spinner';
import css from './Spinner.module.css';

Enzyme.configure({adapter: new Adapter()});

type MockSpinner = {
  spinnerWrapper: ReactWrapper;
  spinnerElement: ReactWrapper;
};

const mockSpinner = (): MockSpinner => {
  const spinnerWrapper = mount(<Spinner />);

  return {
    spinnerWrapper,
    spinnerElement: spinnerWrapper.find('span')
  };
};

describe('UI - Spinner', () => {
  let component: MockSpinner;

  beforeEach(() => {
    component = mockSpinner();
  });

  it('can be instantiated', () => {
    expect(component.spinnerElement.exists()).toEqual(true);
    expect(component.spinnerElement.hasClass(css.spinner)).toEqual(true);
  });
});
