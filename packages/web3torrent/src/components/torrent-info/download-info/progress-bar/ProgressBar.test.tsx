import Enzyme, {mount, ReactWrapper} from 'enzyme';
import Adapter from 'enzyme-adapter-react-16';
import prettier from 'prettier-bytes';
import React from 'react';
import * as Web3TorrentClient from '../../../../clients/web3torrent-client';
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
  positiveButtonElement: ReactWrapper;
  positiveButtonIconElement: ReactWrapper;
  negativeElement: ReactWrapper;
  negativeBarProgressElement: ReactWrapper;
  negativeBarStatusElement: ReactWrapper;
  negativeButtonElement: ReactWrapper;
  negativeButtonIconElement: ReactWrapper;
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
    positiveButtonElement: progressBarWrapper.find('.positive .bar-cancelButton'),
    positiveButtonIconElement: progressBarWrapper.find('.positive .bar-cancelButton svg'),
    negativeElement: progressBarWrapper.find('.negative'),
    negativeBarProgressElement: progressBarWrapper.find('.negative .bar-progress'),
    negativeBarStatusElement: progressBarWrapper.find('.negative .bar-status'),
    negativeButtonElement: progressBarWrapper.find('.negative .bar-cancelButton'),
    negativeButtonIconElement: progressBarWrapper.find('.negative .bar-cancelButton svg')
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
      negativeButtonElement,
      negativeButtonIconElement,
      negativeElement,
      positiveBarProgressElement,
      positiveBarStatusElement,
      positiveButtonElement,
      positiveButtonIconElement,
      positiveElement,
      progressBarProps
    } = progressBar;

    const {downloaded, length} = progressBarProps;

    expect(progressBarContainer.exists()).toEqual(true);
    expect(positiveElement.exists()).toEqual(true);
    expect(positiveBarProgressElement.exists()).toEqual(true);
    expect(positiveBarStatusElement.exists()).toEqual(true);
    expect(positiveButtonElement.exists()).toEqual(true);
    expect(positiveButtonIconElement.exists()).toEqual(true);
    expect(negativeElement.exists()).toEqual(true);
    expect(negativeBarProgressElement.exists()).toEqual(true);
    expect(negativeBarStatusElement.exists()).toEqual(true);
    expect(negativeButtonElement.exists()).toEqual(true);
    expect(negativeButtonIconElement.exists()).toEqual(true);

    expect(positiveBarProgressElement.text()).toEqual(
      `${prettier(downloaded)}/${prettier(length)}`
    );
    expect(positiveElement.prop('style')).toEqual({width: '10%'});
    expect(positiveBarStatusElement.text()).toEqual(Status.Downloading);
    expect(positiveButtonElement.prop('onClick')).toBeUndefined();

    expect(negativeBarProgressElement.text()).toEqual(
      `${prettier(downloaded)}/${prettier(length)}`
    );
    expect(negativeElement.prop('style')).toBeUndefined();
    expect(negativeBarStatusElement.text()).toEqual(Status.Downloading);
    expect(negativeButtonElement.prop('onClick')).not.toBeUndefined();
  });

  it('can show the `complete` class once it reached 100%', () => {
    const {positiveElement, negativeElement} = mockProgressBar({downloaded: 128913});
    expect(positiveElement.hasClass('complete')).toEqual(true);
    expect(negativeElement.hasClass('complete')).toEqual(false);
  });

  it('can call Web3TorrentClient.remove() when clicking the Cancel button', () => {
    const removeSpy = jest
      .spyOn(Web3TorrentClient, 'remove')
      .mockImplementation(async (_?: string) => {
        /* nothing to see here */
      });

    const {positiveButtonElement, negativeButtonElement, progressBarProps} = progressBar;

    positiveButtonElement.simulate('click');
    expect(removeSpy).not.toHaveBeenCalled();

    negativeButtonElement.simulate('click');
    expect(removeSpy).toHaveBeenCalledWith(progressBarProps.infoHash);

    removeSpy.mockRestore();
  });
});
