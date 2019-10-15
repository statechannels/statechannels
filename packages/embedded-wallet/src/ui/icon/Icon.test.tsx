import Enzyme, {mount, ReactWrapper} from 'enzyme';
import Adapter from 'enzyme-adapter-react-16';
import React from 'react';
import {Icon, iconDescriptions, IconProps, Icons} from './Icon';
import css from './Icon.module.css';

Enzyme.configure({adapter: new Adapter()});

type MockIcon = {
  iconWrapper: ReactWrapper;
  iconElement: ReactWrapper;
};

const mockIcon = (props?: Partial<IconProps>): MockIcon => {
  const iconWrapper = mount(<Icon name={Icons.Check} {...props} />);

  return {
    iconWrapper,
    iconElement: iconWrapper.find('span')
  };
};

describe('UI - Icon', () => {
  let component: MockIcon;

  beforeEach(() => {
    component = mockIcon();
  });

  it('can be instantiated', () => {
    expect(component.iconElement.exists()).toEqual(true);
    expect(component.iconElement.hasClass(css.check)).toEqual(true);
    expect(component.iconElement.prop('role')).toEqual('img');
    expect(component.iconElement.prop('aria-label')).toEqual(iconDescriptions[Icons.Check]);
    expect(component.iconElement.prop('aria-hidden')).toBeUndefined();
  });

  it('can be rendered as a presentational, non-ARIA-visible component', () => {
    component = mockIcon({decorative: true});
    expect(component.iconElement.prop('aria-hidden')).toEqual(true);
  });
});
