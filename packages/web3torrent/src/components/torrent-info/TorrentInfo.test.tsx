import Enzyme, {mount, ReactWrapper} from 'enzyme';
import Adapter from 'enzyme-adapter-react-16';
import prettier from 'prettier-bytes';
import React from 'react';
import {TorrentPeers} from '../../library/types';
import {Status, Torrent} from '../../types';
import {createMockTorrent, createMockTorrentPeers} from '../../utils/test-utils';
import {DownloadInfo, DownloadInfoProps} from './download-info/DownloadInfo';
import {
  MagnetLinkButton,
  MagnetLinkButtonProps,
  TorrentInfo,
  TorrentInfoProps
} from './TorrentInfo';
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
  magnetLinkButtonElement: ReactWrapper<MagnetLinkButtonProps>;
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
    expect(fileStatusElement.exists()).toEqual(false);
    expect(fileCostElement.exists()).toEqual(true);
    expect(magnetLinkButtonElement.exists()).toEqual(true);
    expect(downloadInfoElement.exists()).toEqual(true);
    expect(uploadInfoElement.exists()).toEqual(false);

    expect(sectionElement.hasClass('with-link')).toEqual(true);
    expect(fileNameElement.text()).toEqual(torrent.name);
    expect(fileSizeElement.text()).toEqual(prettier(torrent.length));
    expect(fileCostElement.text()).toEqual(`Est. cost $1.34`);
  });

  it('can hide the MagnetLinkButton and the with-link class when no magnet is provided', () => {
    const {sectionElement, magnetLinkButtonElement} = mockTorrentInfo({magnetURI: undefined});
    expect(sectionElement.hasClass('with-link')).toEqual(false);
    expect(magnetLinkButtonElement.exists()).toEqual(false);
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
    expect(fileCostElement.text()).toEqual('Est. cost Unknown');
  });

  it('can show the DownloadInfo component when the status allows it', () => {
    const {downloadInfoElement, uploadInfoElement} = mockTorrentInfo({status: Status.Downloading});
    expect(downloadInfoElement.exists()).toEqual(true);
    expect(uploadInfoElement.exists()).toEqual(false);
  });

  it("can show the UploadInfo component when the client is the torrent's author", () => {
    const {downloadInfoElement, uploadInfoElement} = mockTorrentInfo({
      createdBy: 'Foo',
      ready: false
    });
    expect(downloadInfoElement.exists()).toEqual(false);
    expect(uploadInfoElement.exists()).toEqual(true);
  });

  describe('<MagnetLinkButton />', () => {
    let magnetLinkButtonElement: ReactWrapper<MagnetLinkButtonProps>;

    beforeAll(() => {
      document.execCommand = jest.fn(() => true);
    });

    beforeEach(() => {
      magnetLinkButtonElement = torrentInfo.magnetLinkButtonElement;
    });

    it('should show a tooltip instruting to copy the link', () => {
      const tooltip = magnetLinkButtonElement.find('.tooltiptext');
      expect(tooltip.exists()).toEqual(true);
      expect(tooltip.text()).toEqual('Copy to clipboard');
    });

    it('should copy the link to the clipboard when clicking', () => {
      magnetLinkButtonElement.simulate('click');
      expect(document.execCommand).toHaveBeenCalledWith('copy');

      const tooltip = magnetLinkButtonElement.find('.tooltiptext');
      expect(tooltip.exists()).toEqual(true);
      expect(tooltip.text()).toEqual('Great! Copied to your clipboard');
    });

    afterAll(() => {
      delete document.execCommand;
    });
  });
});
