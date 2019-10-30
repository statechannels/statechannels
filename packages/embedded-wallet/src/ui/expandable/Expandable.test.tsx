import Enzyme, {mount, ReactWrapper} from 'enzyme';
import Adapter from 'enzyme-adapter-react-16';
import React from 'react';
import {Chevron, ChevronProps} from '../chevron/Chevron';
import {Expandable, ExpandableProps} from './Expandable';
import css from './Expandable.module.css';

Enzyme.configure({adapter: new Adapter()});

type MockExpandable = {
  expandableWrapper: ReactWrapper;
  sectionElement: ReactWrapper;
  labelContainer: ReactWrapper;
  labelTextElement: ReactWrapper;
  chevronElement: ReactWrapper<ChevronProps>;
  contentWrapper: ReactWrapper;
};

const mockExpandableContents = <label>I'm hidden</label>;

const mockExpandable = ({
  shouldShowContent = false,
  title = 'More details'
}: Partial<ExpandableProps> = {}): MockExpandable => {
  const expandableWrapper = mount(
    <Expandable shouldShowContent={shouldShowContent} title={title}>
      {mockExpandableContents}
    </Expandable>
  );

  return refreshExpandableFrom(expandableWrapper);
};

const refreshExpandableFrom = (expandableWrapper: ReactWrapper) => {
  expandableWrapper.update();

  return {
    expandableWrapper,
    sectionElement: expandableWrapper.find(`section.${css.expandable}`),
    labelContainer: expandableWrapper.find(`div.${css.labelContainer}`),
    labelTextElement: expandableWrapper.find(`label.${css.label}`),
    chevronElement: expandableWrapper.find(Chevron),
    contentWrapper: expandableWrapper.find("[data-test-selector='expandable-content']")
  };
};

describe('UI - Expandable', () => {
  let expandable: MockExpandable;

  beforeEach(() => {
    expandable = mockExpandable();
  });

  it('can be instantiated', () => {
    const {
      chevronElement,
      contentWrapper,
      labelContainer,
      labelTextElement,
      sectionElement
    } = expandable;

    expect(sectionElement.exists()).toEqual(true);
    expect(labelContainer.exists()).toEqual(true);
    expect(labelTextElement.exists()).toEqual(true);
    expect(chevronElement.exists()).toEqual(true);
    expect(contentWrapper.exists()).toEqual(true);

    expect(chevronElement.prop('direction')).toEqual('down');
    expect(labelTextElement.text()).toEqual('More details');
    expect(contentWrapper.children().length).toEqual(0);
  });

  it('can be expanded, showing content', () => {
    const {expandableWrapper, labelContainer} = expandable;
    labelContainer.simulate('click');

    const {chevronElement, contentWrapper} = refreshExpandableFrom(expandableWrapper);

    expect(contentWrapper.exists()).toEqual(true);
    expect(contentWrapper.children().length).toEqual(1);
    expect(contentWrapper.find('label').text()).toEqual("I'm hidden");

    expect(chevronElement.prop('direction')).toEqual('up');
  });

  it('can be collapsed, hiding content', () => {
    const {expandableWrapper, labelContainer} = mockExpandable({shouldShowContent: true});
    labelContainer.simulate('click');

    const {chevronElement, contentWrapper} = refreshExpandableFrom(expandableWrapper);

    expect(contentWrapper.exists()).toEqual(true);
    expect(contentWrapper.children().length).toEqual(0);
    expect(contentWrapper.find('label').exists()).toEqual(false);

    expect(chevronElement.prop('direction')).toEqual('down');
  });
});
