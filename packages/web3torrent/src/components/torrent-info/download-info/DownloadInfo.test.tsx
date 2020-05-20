import Enzyme, {mount, ReactWrapper} from 'enzyme';
import Adapter from 'enzyme-adapter-react-16';
import React from 'react';
import {TorrentFile} from 'webtorrent';
import * as Web3TorrentContext from '../../../clients/web3torrent-client';
import {TorrentUI} from '../../../types';
import {createMockTorrentUI} from '../../../utils/test-utils';
import {DownloadInfo, DownloadInfoProps} from './DownloadInfo';
import {ProgressBar, ProgressBarProps} from './progress-bar/ProgressBar';

Enzyme.configure({adapter: new Adapter()});

type MockDownloadInfo = {
  downloadInfoWrapper: ReactWrapper<DownloadInfoProps>;
  torrentProps: Partial<TorrentUI>;
  downloadInfoContainer: ReactWrapper;
  progressBarElement: ReactWrapper<ProgressBarProps>;
  cancelButton: ReactWrapper;
};

const mockDownloadInfo = (torrentProps?: Partial<TorrentUI>): MockDownloadInfo => {
  const torrent = createMockTorrentUI(torrentProps);
  const downloadInfoWrapper = mount(<DownloadInfo torrent={torrent} />);

  return {
    downloadInfoWrapper,
    torrentProps: torrent,
    downloadInfoContainer: downloadInfoWrapper.find('.downloadingInfo'),
    progressBarElement: downloadInfoWrapper.find(ProgressBar),
    cancelButton: downloadInfoWrapper.find('.cancel')
  };
};

describe('<DownloadInfo />', () => {
  let downloadInfo: MockDownloadInfo;

  beforeEach(() => {
    downloadInfo = mockDownloadInfo({});
  });

  it('can be instantiated', () => {
    const {downloadInfoContainer, progressBarElement, cancelButton} = downloadInfo;

    expect(downloadInfoContainer.exists()).toEqual(true);
    expect(progressBarElement.exists()).toEqual(true);
    expect(cancelButton.exists()).toEqual(true);
  });

  it('can call web3TorrentClient.cancel() when clicking the Cancel button', () => {
    const removeSpy = jest
      .spyOn(Web3TorrentContext.web3TorrentClient, 'cancel')
      .mockImplementation(async (_?: string) => {
        /* nothing to see here */
      });

    const {cancelButton} = downloadInfo;

    cancelButton.simulate('click');
    expect(removeSpy).toHaveBeenCalledWith(downloadInfo.torrentProps.infoHash);

    removeSpy.mockRestore();
  });

  it('hides the cancel button when finished', () => {
    const {cancelButton} = mockDownloadInfo({
      downloaded: 128913,
      done: true,
      files: [({getBlobURL: resolve => resolve(null, 'blob')} as unknown) as TorrentFile]
    });
    expect(cancelButton.exists()).toEqual(false);
  });
});
