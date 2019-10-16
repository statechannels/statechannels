import Enzyme, {mount, ReactWrapper} from 'enzyme';
import Adapter from 'enzyme-adapter-react-16';
import React from 'react';
import {Slider, SliderProps} from './Slider';
import css from './Slider.module.css';

Enzyme.configure({adapter: new Adapter()});

type MockSlider = {
  sliderWrapper: ReactWrapper<SliderProps>;
  minLabelElement: ReactWrapper;
  sliderElement: ReactWrapper;
  maxLabelElement: ReactWrapper;
  valueLabelElement: ReactWrapper;
};

const mockSlider = (props?: Partial<SliderProps>): MockSlider => {
  const sliderWrapper = mount<SliderProps>(
    <Slider min={0} max={100} step={1} unit="ETH" {...props} />
  );

  return refreshSliderFrom({sliderWrapper} as MockSlider);
};

const refreshSliderFrom = (slider: MockSlider) => {
  const {sliderWrapper} = slider;

  sliderWrapper.update();

  return {
    sliderWrapper,
    minLabelElement: sliderWrapper.find(`label.${css.min}`),
    sliderElement: sliderWrapper.find("input[type='range']"),
    maxLabelElement: sliderWrapper.find(`label.${css.max}`),
    valueLabelElement: sliderWrapper.find(`label.${css.value}`)
  };
};

const triggerKeyOn = (component: MockSlider, element: keyof MockSlider, key: string) => {
  component[element].simulate('keydown', {key});
  return refreshSliderFrom(component);
};

describe('UI - Slider', () => {
  let component: MockSlider;

  beforeEach(() => {
    component = mockSlider();
  });

  it('can be instantiated', () => {
    const {
      minLabelElement,
      valueLabelElement,
      maxLabelElement,
      sliderElement
    } = component;
    
    expect(minLabelElement.exists()).toEqual(true);
    expect(minLabelElement.text()).toEqual('0');
    expect(minLabelElement.prop('aria-hidden')).toEqual('true');
    
    expect(valueLabelElement.exists()).toEqual(true);
    expect(valueLabelElement.text()).toEqual('0');
    expect(valueLabelElement.prop('aria-hidden')).toEqual('true');
    
    expect(maxLabelElement.exists()).toEqual(true);
    expect(maxLabelElement.text()).toEqual('100ETH');
    expect(maxLabelElement.prop('aria-hidden')).toEqual('true');
    
    expect(sliderElement.exists()).toEqual(true);
    expect(sliderElement.hasClass(css.slider)).toEqual(true);
    expect(sliderElement.prop('min')).toEqual(0);
    expect(sliderElement.prop('max')).toEqual(100);
    expect(sliderElement.prop('value')).toEqual(0);
    expect(sliderElement.prop('step')).toEqual(1);
    expect(sliderElement.prop('aria-atomic')).toEqual(true);
    expect(sliderElement.prop('aria-valuemin')).toEqual(0);
    expect(sliderElement.prop('aria-valuemax')).toEqual(100);
    expect(sliderElement.prop('aria-valuenow')).toEqual(0);
    expect(sliderElement.prop('aria-label')).toEqual('Current allocation: 0 ETH');
    expect(sliderElement.prop('type')).toEqual('range');
    expect(sliderElement.prop('onChange')).toBeInstanceOf(Function);
    expect(sliderElement.prop('onKeyDown')).toBeInstanceOf(Function);
  });

  describe('can change its value with the keyboard', () => {
    const keyboardCases = [
      ['increasing', 'ArrowUp', 1],
      ['increasing', 'ArrowRight', 1],
      ['increasing', 'PageUp', 10],
      ['decreasing', 'ArrowDown', -1],
      ['decreasing', 'ArrowLeft', -1],
      ['decreasing', 'PageDown', -10]
    ];

    beforeEach(() => {
      component = mockSlider({initialValue: 50});
    });

    it.each(keyboardCases)('%s it by %i when pressing %s', (_, key, numberChange) => {
      const {
        sliderElement,
        valueLabelElement
      } = triggerKeyOn(component, 'sliderElement', key as string);
      
      const value = sliderElement.prop('value');
      const ariaLabel = `Current allocation: ${value} ETH`;
      
      expect(value).toEqual(50 + (numberChange as number));
      expect(valueLabelElement.text()).toEqual(`${value}`);
      expect(sliderElement.prop('aria-label')).toEqual(ariaLabel);
    });
  });

  it("can't surpass its maximum value", () => {
    const changed = jest.fn();
    component = mockSlider({initialValue: 100, onChange: changed});
    expect(component.sliderElement.prop('value')).toEqual(100);
    component = triggerKeyOn(component, 'sliderElement', 'ArrowUp');
    expect(component.sliderElement.prop('value')).toEqual(100);
    expect(changed).not.toHaveBeenCalled();
  });

  it("can't go below its minimum value", () => {
    const changed = jest.fn();
    component = mockSlider({onChange: changed});

    component = triggerKeyOn(component, 'sliderElement', 'ArrowDown');
    expect(component.sliderElement.prop('value')).toEqual(0);

    expect(changed).not.toHaveBeenCalled();
  });

  it('can trigger an onChange event', () => {
    const changed = jest.fn();
    component = mockSlider({initialValue: 50, onChange: changed});
    component = triggerKeyOn(component, 'sliderElement', 'ArrowUp');
    expect(changed).toHaveBeenCalledTimes(1);
    expect(changed).toHaveBeenCalledWith(51);
  });
});
