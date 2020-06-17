import Enzyme, {mount, ReactWrapper} from 'enzyme';
import Adapter from 'enzyme-adapter-react-16';
import React from 'react';
import {TorrentPeers} from '../../../library/types';
import {TorrentUI, Status} from '../../../types';
import {createMockTorrentUI, createMockTorrentPeers, testSelector} from '../../../utils/test-utils';
import {PeerNetworkStats, PeerNetworkStatsProps} from './PeerNetworkStats';
import {getFormattedETA} from '../../../utils/torrent-status-checker';

Enzyme.configure({adapter: new Adapter()});

type MockPeerNetworkStats = {
  torrent: Partial<TorrentUI>;
  peers: TorrentPeers;
  PeerNetworkStatsWrapper: ReactWrapper<PeerNetworkStatsProps>;
  uploadingSectionElement: ReactWrapper;
  numPeersElement: ReactWrapper;
};

const mockPeerNetworkStats = (noPeers = false, isOriginalSeed = true): MockPeerNetworkStats => {
  const peers = noPeers ? {} : createMockTorrentPeers();
  const torrent = createMockTorrentUI({
    numPeers: Object.keys(peers).length,
    originalSeed: isOriginalSeed,
    parsedTimeRemaining: getFormattedETA(false, 3000),
    downloadSpeed: isOriginalSeed ? 0 : 10240,
    uploadSpeed: 5124,
    status: Status.Downloading
  });

  torrent.wires = [
    {paidStreamingExtension: {leechingChannelId: '0x'}} as any,
    {paidStreamingExtension: {leechingChannelId: '0x'}} as any
  ];

  const PeerNetworkStatsWrapper = mount(<PeerNetworkStats torrent={torrent} />);

  return {
    PeerNetworkStatsWrapper,
    torrent,
    peers,
    uploadingSectionElement: PeerNetworkStatsWrapper.find('.PeerNetworkStats'),
    numPeersElement: PeerNetworkStatsWrapper.find(testSelector('numPeers'))
  };
};

describe('<PeerNetworkStats />', () => {
  let PeerNetworkStats: MockPeerNetworkStats;

  beforeEach(() => {
    PeerNetworkStats = mockPeerNetworkStats();
  });

  it('can be instantiated and show more info', () => {
    const {numPeersElement, torrent} = PeerNetworkStats;

    expect(numPeersElement.exists()).toEqual(true);

    expect(numPeersElement.text()).toEqual(`${torrent.wires.length}`);
  });

  it('can show the correct peer an speed info', () => {
    const {numPeersElement, torrent, uploadingSectionElement} = PeerNetworkStats;

    expect(uploadingSectionElement.exists()).toEqual(true);
    expect(numPeersElement.exists()).toEqual(true);

    expect(numPeersElement.text()).toEqual(`${torrent.wires.length}`);
  });
});
