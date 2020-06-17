import Enzyme, {mount, ReactWrapper} from 'enzyme';
import Adapter from 'enzyme-adapter-react-16';
import prettier from 'prettier-bytes';
import React from 'react';
import {TorrentPeers} from '../../library/types';
import {Status, TorrentUI} from '../../types';
import {createMockTorrentUI, createMockTorrentPeers} from '../../utils/test-utils';
import {DownloadInfo, DownloadInfoProps} from './download-info/DownloadInfo';
import {MagnetLinkButton} from './magnet-link-button/MagnetLinkButton';
import {TorrentInfo, TorrentInfoProps} from './TorrentInfo';
import {PeerNetworkStats, PeerNetworkStatsProps} from './peer-network-stats/PeerNetworkStats';
import {mockMetamask} from '../../library/testing/test-utils';

Enzyme.configure({adapter: new Adapter()});

type MockTorrentInfo = {
  torrentInfoWrapper: ReactWrapper<TorrentInfoProps>;
  torrent: Partial<TorrentUI>;
  peers: TorrentPeers;
  sectionElement: ReactWrapper;
  fileNameElement: ReactWrapper;
  fileSizeElement: ReactWrapper;
  fileStatusElement: ReactWrapper;
  fileCostElement: ReactWrapper;
  magnetLinkButtonElement: ReactWrapper<{}>;
  downloadInfoElement: ReactWrapper<DownloadInfoProps>;
  PeerNetworkStatsElement: ReactWrapper<PeerNetworkStatsProps>;
};

const mockTorrentInfo = (torrentProps?: Partial<TorrentUI>): MockTorrentInfo => {
  const torrent = createMockTorrentUI(torrentProps);
  const peers = createMockTorrentPeers();
  const torrentInfoWrapper = mount(
    <TorrentInfo torrent={torrent} channelCache={{}} mySigningAddress="0x0" />
  );

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
    PeerNetworkStatsElement: torrentInfoWrapper.find(PeerNetworkStats)
  };
};

describe('<TorrentInfo />', () => {
  let torrentInfo: MockTorrentInfo;

  beforeAll(() => {
    mockMetamask();
  });

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
      torrent
    } = torrentInfo;

    expect(sectionElement.exists()).toEqual(true);
    expect(fileNameElement.exists()).toEqual(true);
    expect(fileSizeElement.exists()).toEqual(true);
    expect(fileStatusElement.exists()).toEqual(true);
    expect(fileCostElement.exists()).toEqual(true);
    expect(magnetLinkButtonElement.exists()).toEqual(true);
    expect(downloadInfoElement.exists()).toEqual(false);

    expect(fileNameElement.text()).toEqual(torrent.name);
    expect(fileSizeElement.text()).toEqual(`Size: ${prettier(torrent.length)}`);
  });

  it('can show the `? Mb` label when the torrent size is unknown', () => {
    const {fileSizeElement} = mockTorrentInfo({length: 0});
    expect(fileSizeElement.text()).toEqual('Size: ? Mb');
  });

  it('can show the status when available', () => {
    const {fileStatusElement} = mockTorrentInfo({status: Status.Connecting});
    expect(fileStatusElement.text()).toEqual(`Status: ${Status.Connecting}`);
  });

  it('can show `Unknown` when the torrent cost is not available', () => {
    const {fileCostElement} = mockTorrentInfo({length: 0});
    expect(fileCostElement.text()).toEqual('Cost: unknown');
  });

  it('can show the DownloadInfo component when the status allows it', () => {
    expect(
      mockTorrentInfo({
        status: Status.Downloading
      }).downloadInfoElement.exists()
    ).toEqual(true);
  });

  it("can show the PeerNetworkStats component when the client is the torrent's author", () => {
    const {downloadInfoElement, PeerNetworkStatsElement} = mockTorrentInfo({
      status: Status.Seeding
    });
    expect(downloadInfoElement.exists()).toEqual(false);
    expect(PeerNetworkStatsElement.exists()).toEqual(true);
  });
});
