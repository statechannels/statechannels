import Enzyme, {mount} from 'enzyme';
import Adapter from 'enzyme-adapter-react-16';
import React from 'react';
import {Chevron, ChevronDirection, ChevronProps} from './Chevron';
import css from './Chevron.module.css';

Enzyme.configure({adapter: new Adapter()});

const mockChevron = ({direction}: ChevronProps) =>
  mount(<Chevron direction={direction} />).find('span');

describe('UI - Chevron', () => {
  it.each(['up', 'down', 'left', 'right'])('can show a chevron facing %s', direction => {
    const chevron = mockChevron({direction: direction as ChevronDirection});
    expect(chevron.exists()).toEqual(true);
    expect(chevron.hasClass(css.chevron)).toEqual(true);
    expect(chevron.hasClass(css[direction])).toEqual(true);
  });
});
