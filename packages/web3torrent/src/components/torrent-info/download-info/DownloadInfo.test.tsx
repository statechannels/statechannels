import Enzyme, {mount, ReactWrapper} from 'enzyme';
import Adapter from 'enzyme-adapter-react-16';
import React from 'react';
import {TorrentFile} from 'webtorrent';
import * as Web3TorrentClient from '../../../clients/web3torrent-client';
import {Torrent} from '../../../types';
import {createMockTorrent} from '../../../utils/test-utils';
import {getFormattedETA} from '../../../utils/torrent-status-checker';
import {DownloadInfo, DownloadInfoProps} from './DownloadInfo';
import {ProgressBar, ProgressBarProps} from './progress-bar/ProgressBar';

Enzyme.configure({adapter: new Adapter()});

type MockDownloadInfo = {
  downloadInfoWrapper: ReactWrapper<DownloadInfoProps>;
  torrentProps: Partial<Torrent>;
  downloadInfoContainer: ReactWrapper;
  progressBarElement: ReactWrapper<ProgressBarProps>;
  textElement: ReactWrapper;
  cancelButton: ReactWrapper;
};

const mockDownloadInfo = (torrentProps?: Partial<Torrent>): MockDownloadInfo => {
  const torrent = createMockTorrent(torrentProps);
  torrent.parsedTimeRemaining = getFormattedETA(torrent as Torrent);
  const downloadInfoWrapper = mount(<DownloadInfo torrent={torrent as Torrent} />);

  return {
    downloadInfoWrapper,
    torrentProps: torrent,
    downloadInfoContainer: downloadInfoWrapper.find('.downloadingInfo'),
    progressBarElement: downloadInfoWrapper.find(ProgressBar),
    textElement: downloadInfoWrapper.find('.downloadingInfo > p'),
    cancelButton: downloadInfoWrapper.find('.cancel')
  };
};

describe('<DownloadInfo />', () => {
  let downloadInfo: MockDownloadInfo;

  beforeEach(() => {
    downloadInfo = mockDownloadInfo({
      timeRemaining: 3000,
      numPeers: 3,
      downloadSpeed: 10240,
      uploadSpeed: 5124
    });
  });

  it('can be instantiated', () => {
    const {
      downloadInfoContainer,
      progressBarElement,
      textElement,
      torrentProps,
      cancelButton
    } = downloadInfo;

    expect(downloadInfoContainer.exists()).toEqual(true);
    expect(progressBarElement.exists()).toEqual(true);
    expect(textElement.exists()).toEqual(true);
    expect(cancelButton.exists()).toEqual(true);

    expect(progressBarElement.props()).toEqual({
      downloaded: torrentProps.downloaded,
      length: torrentProps.length,
      status: torrentProps.status
    });
    expect(textElement.html()).toEqual(
      `<p>ETA 3s. 10 KB/s down, 5.1 KB/s up<br>Connected to <strong>3</strong> peers.</p>`
    );
  });

  it('can call Web3TorrentClient.remove() when clicking the Cancel button', () => {
    const removeSpy = jest
      .spyOn(Web3TorrentClient, 'remove')
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
