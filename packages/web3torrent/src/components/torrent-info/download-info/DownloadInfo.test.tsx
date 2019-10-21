import Enzyme, {mount, ReactWrapper} from 'enzyme';
import Adapter from 'enzyme-adapter-react-16';
import React from 'react';
import {TorrentFile} from 'webtorrent';
import {ExtendedTorrent} from '../../../library/types';
import {Torrent} from '../../../types';
import {createMockTorrent} from '../../../utils/test-utils';
import {getFormattedETA} from '../../../utils/torrent-status-checker';
import {FormButton, FormButtonProps} from '../../form';
import {DownloadInfo, DownloadInfoProps} from './DownloadInfo';
import {ProgressBar, ProgressBarProps} from './progress-bar/ProgressBar';

Enzyme.configure({adapter: new Adapter()});

type MockDownloadInfo = {
  downloadInfoWrapper: ReactWrapper<DownloadInfoProps>;
  torrentProps: Partial<Torrent>;
  downloadInfoContainer: ReactWrapper;
  progressBarElement: ReactWrapper<ProgressBarProps>;
  textElement: ReactWrapper;
  downloadLink: ReactWrapper;
  downloadButton: ReactWrapper<FormButtonProps>;
};

const mockDownloadInfo = (torrentProps?: Partial<Torrent>): MockDownloadInfo => {
  const torrent = createMockTorrent(torrentProps);
  torrent.parsedTimeRemaining = getFormattedETA(torrent as ExtendedTorrent);
  const downloadInfoWrapper = mount(<DownloadInfo torrent={torrent as Torrent} />);

  return {
    downloadInfoWrapper,
    torrentProps: torrent,
    downloadInfoContainer: downloadInfoWrapper.find('.downloadingInfo'),
    progressBarElement: downloadInfoWrapper.find(ProgressBar),
    textElement: downloadInfoWrapper.find('.downloadingInfo > p'),
    downloadLink: downloadInfoWrapper.find('.downloadingInfo > a'),
    downloadButton: downloadInfoWrapper.find(FormButton)
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
      downloadButton,
      downloadInfoContainer,
      downloadLink,
      progressBarElement,
      textElement,
      torrentProps
    } = downloadInfo;

    expect(downloadInfoContainer.exists()).toEqual(true);
    expect(progressBarElement.exists()).toEqual(true);
    expect(textElement.exists()).toEqual(true);
    expect(downloadButton.exists()).toEqual(false);
    expect(downloadLink.exists()).toEqual(false);

    expect(progressBarElement.props()).toEqual({
      infoHash: torrentProps.infoHash,
      downloaded: torrentProps.downloaded,
      length: torrentProps.length,
      status: torrentProps.status
    });
    expect(textElement.html()).toEqual(
      `<p>ETA 3s. 10 KB/s down, 5.1 KB/s up<br>Connected to <strong>3</strong> peers.</p>`
    );
  });

  it('can show a Save Download link when finished', () => {
    const {downloadLink, downloadButton, torrentProps} = mockDownloadInfo({
      downloaded: 128913,
      done: true,
      files: [({getBlobURL: resolve => resolve(null, 'blob')} as unknown) as TorrentFile]
    });
    expect(downloadLink.exists()).toEqual(true);
    expect(downloadLink.prop('href')).toEqual('blob');
    expect(downloadLink.prop('download')).toEqual(torrentProps.name);
    expect(downloadButton.exists()).toEqual(true);
    expect(downloadButton.text()).toEqual('Save Download');
    expect(downloadButton.prop('name')).toEqual('save-download');
  });
});
