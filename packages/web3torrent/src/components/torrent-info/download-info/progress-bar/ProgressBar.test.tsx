import Enzyme, {mount, ReactWrapper} from 'enzyme';
import Adapter from 'enzyme-adapter-react-16';
import prettier from 'prettier-bytes';
import React from 'react';
import {Status} from '../../../../types';
import {ProgressBar, ProgressBarProps} from './ProgressBar';

Enzyme.configure({adapter: new Adapter()});

type MockProgressBar = {
  progressBarWrapper: ReactWrapper<ProgressBarProps>;
  progressBarProps: ProgressBarProps;
  progressBarContainer: ReactWrapper;
  positiveElement: ReactWrapper;
  positiveBarProgressElement: ReactWrapper;
  positiveBarStatusElement: ReactWrapper;
  negativeElement: ReactWrapper;
  negativeBarProgressElement: ReactWrapper;
  negativeBarStatusElement: ReactWrapper;
};

const mockProgressBar = (props?: Partial<ProgressBarProps>): MockProgressBar => {
  const progressBarProps = {
    downloaded: 12891.3,
    length: 128913,
    status: Status.Downloading,
    infoHash: '14mt0rr3nt',
    ...props
  };

  const progressBarWrapper = mount(<ProgressBar {...progressBarProps} />);

  return {
    progressBarWrapper,
    progressBarProps,
    progressBarContainer: progressBarWrapper.find('.progress-bar'),
    positiveElement: progressBarWrapper.find('.positive'),
    positiveBarProgressElement: progressBarWrapper.find('.positive .bar-progress'),
    positiveBarStatusElement: progressBarWrapper.find('.positive .bar-status'),
    negativeElement: progressBarWrapper.find('.negative'),
    negativeBarProgressElement: progressBarWrapper.find('.negative .bar-progress'),
    negativeBarStatusElement: progressBarWrapper.find('.negative .bar-status')
  };
};

describe('<ProgressBar />', () => {
  let progressBar: MockProgressBar;

  beforeEach(() => {
    progressBar = mockProgressBar();
  });

  it('can be instantiated', () => {
    const {
      progressBarContainer,
      negativeBarProgressElement,
      negativeBarStatusElement,
      negativeElement,
      positiveBarProgressElement,
      positiveBarStatusElement,
      positiveElement,
      progressBarProps
    } = progressBar;

    const {downloaded, length} = progressBarProps;

    expect(progressBarContainer.exists()).toEqual(true);
    expect(positiveElement.exists()).toEqual(true);
    expect(positiveBarProgressElement.exists()).toEqual(true);
    expect(positiveBarStatusElement.exists()).toEqual(true);
    expect(negativeElement.exists()).toEqual(true);
    expect(negativeBarProgressElement.exists()).toEqual(true);
    expect(negativeBarStatusElement.exists()).toEqual(true);

    expect(positiveBarProgressElement.text()).toEqual(
      `${prettier(downloaded)}/${prettier(length)}`
    );
    expect(positiveElement.prop('style')).toEqual({width: '10%'});
    expect(positiveBarStatusElement.text()).toEqual(Status.Downloading);

    expect(negativeBarProgressElement.text()).toEqual(
      `${prettier(downloaded)}/${prettier(length)}`
    );
    expect(negativeElement.prop('style')).toBeUndefined();
    expect(negativeBarStatusElement.text()).toEqual(Status.Downloading);
  });

  it('can show the `complete` class once it reached 100%', () => {
    const {positiveElement, negativeElement} = mockProgressBar({downloaded: 128913});
    expect(positiveElement.hasClass('complete')).toEqual(true);
    expect(negativeElement.hasClass('complete')).toEqual(false);
  });
});
