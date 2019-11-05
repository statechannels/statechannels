import Enzyme, {mount, ReactWrapper} from 'enzyme';
import Adapter from 'enzyme-adapter-react-16';
import prettier from 'prettier-bytes';
import React from 'react';
import {TorrentPeers} from '../../library/types';
import {Status, Torrent} from '../../types';
import {createMockTorrent, createMockTorrentPeers} from '../../utils/test-utils';
import {DownloadInfo, DownloadInfoProps} from './download-info/DownloadInfo';
import {MagnetLinkButton} from './magnet-link-button/MagnetLinkButton';
import {TorrentInfo, TorrentInfoProps} from './TorrentInfo';
import {UploadInfo, UploadInfoProps} from './upload-info/UploadInfo';

Enzyme.configure({adapter: new Adapter()});

type MockTorrentInfo = {
  torrentInfoWrapper: ReactWrapper<TorrentInfoProps>;
  torrent: Partial<Torrent>;
  peers: TorrentPeers;
  sectionElement: ReactWrapper;
  fileNameElement: ReactWrapper;
  fileSizeElement: ReactWrapper;
  fileStatusElement: ReactWrapper;
  fileCostElement: ReactWrapper;
  magnetLinkButtonElement: ReactWrapper<{}>;
  downloadInfoElement: ReactWrapper<DownloadInfoProps>;
  uploadInfoElement: ReactWrapper<UploadInfoProps>;
};

const mockTorrentInfo = (torrentProps?: Partial<Torrent>): MockTorrentInfo => {
  const torrent = createMockTorrent(torrentProps);
  const peers = createMockTorrentPeers();
  const torrentInfoWrapper = mount(<TorrentInfo torrent={torrent as Torrent} peers={peers} />);

  return {
    torrentInfoWrapper,
    torrent,
    peers,
    sectionElement: torrentInfoWrapper.find('.torrentInfo'),
    fileNameElement: torrentInfoWrapper.find('.fileName'),
    fileSizeElement: torrentInfoWrapper.find('.fileSize'),
    fileStatusElement: torrentInfoWrapper.find('.fileStatus'),
    fileCostElement: torrentInfoWrapper.find('.fileCost'),
    magnetLinkButtonElement: torrentInfoWrapper.find(MagnetLinkButton),
    downloadInfoElement: torrentInfoWrapper.find(DownloadInfo),
    uploadInfoElement: torrentInfoWrapper.find(UploadInfo)
  };
};

describe('<TorrentInfo />', () => {
  let torrentInfo: MockTorrentInfo;

  beforeEach(() => {
    torrentInfo = mockTorrentInfo();
  });

  it('can be instantiated', () => {
    const {
      downloadInfoElement,
      fileCostElement,
      fileNameElement,
      fileSizeElement,
      fileStatusElement,
      magnetLinkButtonElement,
      sectionElement,
      uploadInfoElement,
      torrent
    } = torrentInfo;

    expect(sectionElement.exists()).toEqual(true);
    expect(fileNameElement.exists()).toEqual(true);
    expect(fileSizeElement.exists()).toEqual(true);
    expect(fileStatusElement.exists()).toEqual(true);
    expect(fileCostElement.exists()).toEqual(true);
    expect(magnetLinkButtonElement.exists()).toEqual(true);
    expect(downloadInfoElement.exists()).toEqual(false);
    expect(uploadInfoElement.exists()).toEqual(false);

    expect(fileNameElement.text()).toEqual(torrent.name);
    expect(fileSizeElement.text()).toEqual(prettier(torrent.length));
    expect(fileCostElement.text()).toEqual(`Cost $1.34`);
  });

  it('can show the `? Mb` label when the torrent size is unknown', () => {
    const {fileSizeElement} = mockTorrentInfo({length: 0});
    expect(fileSizeElement.text()).toEqual('? Mb');
  });

  it('can show the status when available', () => {
    const {fileStatusElement} = mockTorrentInfo({status: Status.Connecting});
    expect(fileStatusElement.text()).toEqual(Status.Connecting);
  });

  it('can show `Unknown` when the torrent cost is not available', () => {
    const {fileCostElement} = mockTorrentInfo({cost: undefined});
    expect(fileCostElement.text()).toEqual('Cost Unknown');
  });

  it('can show the DownloadInfo component when the status allows it', () => {
    const {downloadInfoElement, uploadInfoElement} = mockTorrentInfo({status: Status.Downloading});
    expect(downloadInfoElement.exists()).toEqual(true);
    expect(uploadInfoElement.exists()).toEqual(false);
  });

  it("can show the UploadInfo component when the client is the torrent's author", () => {
    const {downloadInfoElement, uploadInfoElement} = mockTorrentInfo({
      status: Status.Seeding
    });
    expect(downloadInfoElement.exists()).toEqual(false);
    expect(uploadInfoElement.exists()).toEqual(true);
  });
});
