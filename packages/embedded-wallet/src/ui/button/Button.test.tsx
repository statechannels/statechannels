import Enzyme, {mount, ReactWrapper} from 'enzyme';
import Adapter from 'enzyme-adapter-react-16';
import React, {PropsWithChildren} from 'react';
import {Icon, IconProps, Icons} from '../icon/Icon';
import {Button, ButtonProps} from './Button';
import css from './Button.module.css';

Enzyme.configure({adapter: new Adapter()});

const clicked = jest.fn();

type MockButton = {
  buttonWrapper: ReactWrapper;
  buttonElement: ReactWrapper;
  labelElement: ReactWrapper;
  iconElement: ReactWrapper<PropsWithChildren<IconProps>>;
};

const mockButton = (props?: Partial<ButtonProps>): MockButton => {
  const buttonWrapper = mount(
    <Button label="Click me" type="primary" onClick={clicked} {...props} />
  );
  const buttonElement = buttonWrapper.find(`button`);
  const labelElement = buttonWrapper.find(`span.${css.buttonLabel}`);
  const iconElement = buttonWrapper.find(Icon);

  return {
    buttonWrapper,
    buttonElement,
    labelElement,
    iconElement
  };
};

describe('UI - Button', () => {
  let component: MockButton;

  beforeEach(() => {
    component = mockButton();
  });

  it('can be instantiated', () => {
    const {buttonWrapper, buttonElement, iconElement} = component;
    expect(buttonWrapper.text()).toEqual('Click me');
    expect(buttonElement.hasClass(css.primary)).toEqual(true);
    expect(iconElement.exists()).toEqual(false);
  });

  it('can be clicked', () => {
    component.buttonElement.simulate('click');
    expect(clicked).toHaveBeenCalled();
  });

  it('can be rendered as a secondary button', () => {
    component = mockButton({type: 'secondary'});
    expect(component.buttonElement.hasClass(css.secondary)).toEqual(true);
  });

  it('can have an icon to the left', () => {
    component = mockButton({icon: Icons.Check, iconPosition: 'left'});
    expect(component.iconElement.prop('name')).toEqual(Icons.Check);
    expect(component.buttonElement.hasClass(css.leftIcon)).toEqual(true);
  });

  it('can have an icon to the right', () => {
    component = mockButton({icon: Icons.Check, iconPosition: 'right'});
    expect(component.iconElement.prop('name')).toEqual(Icons.Check);
    expect(component.buttonElement.hasClass(css.rightIcon)).toEqual(true);
  });
});
