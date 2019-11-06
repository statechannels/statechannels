import Enzyme, {mount} from 'enzyme';
import Adapter from 'enzyme-adapter-react-16';
import React from 'react';
import {MagnetLinkButton} from './MagnetLinkButton';

Enzyme.configure({adapter: new Adapter()});

describe('<MagnetLinkButton />', () => {
  let component: Enzyme.ReactWrapper;

  beforeAll(() => {
    document.execCommand = jest.fn(() => true);
    component = mount(<MagnetLinkButton />);
  });

  it('renders without crashing', () => {
    expect(component.find('.fileLink').exists()).toBe(true);
  });

  it('renders a button with default properties', () => {
    expect(component.find('.fileLink').exists()).toBe(true);
  });

  it('should show a tooltip instruting to copy the link', () => {
    const tooltip = component.find('.tooltiptext');
    expect(tooltip.exists()).toEqual(true);
    expect(tooltip.text()).toEqual('Copy to clipboard');
  });

  it('should copy the link to the clipboard when clicking', () => {
    component.simulate('click');
    expect(document.execCommand).toHaveBeenCalledWith('copy');

    const tooltip = component.find('.tooltiptext');
    expect(tooltip.exists()).toEqual(true);
    expect(tooltip.text()).toEqual('Great! Copied to your clipboard');
  });

  afterAll(() => {
    delete document.execCommand;
  });
});
