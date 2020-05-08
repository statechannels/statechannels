import Enzyme, {mount, ReactWrapper} from 'enzyme';
import Adapter from 'enzyme-adapter-react-16';
import React from 'react';
import {TorrentPeers} from '../../../library/types';
import {TorrentUI, Status} from '../../../types';
import {createMockTorrentUI, createMockTorrentPeers, testSelector} from '../../../utils/test-utils';
import {PeerSpeedInfo, PeerSpeedInfoProps} from './PeerSpeedInfo';
import {getFormattedETA} from '../../../utils/torrent-status-checker';

Enzyme.configure({adapter: new Adapter()});

type MockPeerSpeedInfo = {
  torrent: Partial<TorrentUI>;
  peers: TorrentPeers;
  PeerSpeedInfoWrapper: ReactWrapper<PeerSpeedInfoProps>;
  uploadingSectionElement: ReactWrapper;
  numPeersElement: ReactWrapper;
};

const mockPeerSpeedInfo = (noPeers = false, isOriginalSeed = true): MockPeerSpeedInfo => {
  const peers = noPeers ? {} : createMockTorrentPeers();
  const torrent = createMockTorrentUI({
    numPeers: Object.keys(peers).length,
    originalSeed: isOriginalSeed,
    parsedTimeRemaining: getFormattedETA(false, 3000),
    downloadSpeed: isOriginalSeed ? 0 : 10240,
    uploadSpeed: 5124,
    status: Status.Downloading
  });

  const PeerSpeedInfoWrapper = mount(<PeerSpeedInfo torrent={torrent} />);

  return {
    PeerSpeedInfoWrapper,
    torrent,
    peers,
    uploadingSectionElement: PeerSpeedInfoWrapper.find('.peerSpeedInfo'),
    numPeersElement: PeerSpeedInfoWrapper.find(testSelector('numPeers'))
  };
};

describe('<PeerSpeedInfo />', () => {
  let PeerSpeedInfo: MockPeerSpeedInfo;

  beforeEach(() => {
    PeerSpeedInfo = mockPeerSpeedInfo();
  });

  it('can be instantiated and show more info', () => {
    const {numPeersElement, torrent, uploadingSectionElement} = PeerSpeedInfo;

    expect(numPeersElement.exists()).toEqual(true);

    expect(numPeersElement.text()).toEqual(`${torrent.numPeers}`);
  });

  it('can show the correct peer an speed info', () => {
    const {numPeersElement, torrent, uploadingSectionElement} = PeerSpeedInfo;

    expect(uploadingSectionElement.exists()).toEqual(true);
    expect(numPeersElement.exists()).toEqual(true);

    expect(numPeersElement.text()).toEqual(`${torrent.numPeers}`);
  });
});
