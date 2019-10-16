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
    const {iconElement} = component;
    expect(iconElement.exists()).toEqual(true);
    expect(iconElement.hasClass(css.check)).toEqual(true);
    expect(iconElement.prop('role')).toEqual('img');
    expect(iconElement.prop('aria-label')).toEqual(iconDescriptions[Icons.Check]);
    expect(iconElement.prop('aria-hidden')).toBeUndefined();
  });

  it('can be rendered as a presentational, non-ARIA-visible component', () => {
    const {iconElement} = mockIcon({decorative: true});
    expect(iconElement.prop('aria-hidden')).toEqual(true);
  });
});
