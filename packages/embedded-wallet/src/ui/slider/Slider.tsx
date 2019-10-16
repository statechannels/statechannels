import debug from 'debug';
import React, {
  ChangeEvent,
  Dispatch,
  KeyboardEvent,
  RefObject,
  SetStateAction,
  useContext,
  useEffect,
  useRef,
  useState
} from 'react';
import {DialogContext, DialogContextProps} from '../dialog/Dialog';
import css from './Slider.module.css';

const log = debug('ui:slider');

export type SliderProps = {
  min: number;
  max: number;
  step: number;
  unit: string;
  initialValue?: number;
  onChange?: (value: number) => void;
};

const onRangeChange = (
  setValue: Dispatch<SetStateAction<number>>,
  onChange?: (value: number) => void
) => (event: ChangeEvent<HTMLInputElement>) => {
  const value = parseFloat(event.target.value);

  setValue(value);

  if (onChange) {
    onChange(value);
  }
};

const onRangeKeyDown = (
  value: number,
  step: number,
  max: number,
  min: number,
  setValue: Dispatch<SetStateAction<number>>,
  onChange?: (value: number) => void
) => (event: KeyboardEvent<HTMLInputElement>) => {
  const originalValue = value;

  if (event.key === 'ArrowUp' || event.key === 'ArrowRight') {
    value += step;
  } else if (event.key === 'ArrowDown' || event.key === 'ArrowLeft') {
    value -= step;
  } else if (event.key === 'PageUp') {
    value += step * 10;
  } else if (event.key === 'PageDown') {
    value -= step * 10;
  }

  if (value > max) {
    value = max;
  } else if (value < min) {
    value = min;
  }

  setValue(value);

  if (onChange && originalValue !== value) {
    onChange(value);
  }
};

const calculateOffsetX = (
  containerRef: RefObject<HTMLDivElement>,
  valueLabelRef: RefObject<HTMLLabelElement>,
  value: number,
  max: number,
  min: number = 0,
  dialogContext: DialogContextProps
) => {
  if (dialogContext && dialogContext.ready === false) {
    return;
  }

  const container = containerRef.current as HTMLDivElement;
  const valueLabel = valueLabelRef.current as HTMLLabelElement;

  const containerWidth = container.offsetWidth;
  const valueLabelWidth = valueLabel.offsetWidth;

  // TODO: This formula can be improved to have a perfect center on the value indicator,
  // but it's good enough for now.
  const left = Math.max(((value - min) / (max - min)) * containerWidth - valueLabelWidth / 2, -4);

  log(
    'containerWidth: %o | valueLabelWidth: %o | left: %o',
    container.style.animationPlayState,
    containerWidth,
    valueLabelWidth,
    left
  );

  return left;
};

const Slider: React.FC<SliderProps> = ({min, max, step, unit, onChange, initialValue = 0}) => {
  const [value, setValue] = useState<number>(initialValue);
  const context = useContext(DialogContext);
  const containerRef = useRef<HTMLDivElement>(null);
  const valueLabelRef = useRef<HTMLLabelElement>(null);

  const [offsetX, setOffsetX] = useState<number>();

  useEffect(() => {
    setOffsetX(calculateOffsetX(containerRef, valueLabelRef, value, max, min, context));
  }, [context, value, min, max]);

  return (
    <div className={css.sliderContainer} ref={containerRef}>
      <label aria-hidden="true" className={css.min}>
        {min}
      </label>
      <input
        aria-atomic
        aria-valuemax={max}
        aria-valuemin={min}
        aria-valuenow={value}
        aria-label={`Current allocation: ${value} ${unit}`}
        className={css.slider}
        onChange={onRangeChange(setValue, onChange)}
        onKeyDown={onRangeKeyDown(value, step, max, min, setValue, onChange)}
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
      />
      <label aria-hidden="true" className={css.max}>
        {max}
        {unit}
      </label>
      <label aria-hidden="true" className={css.value} ref={valueLabelRef} style={{left: offsetX}}>
        {value}
      </label>
    </div>
  );
};

export {Slider};
