import Enzyme, {mount, ReactWrapper} from 'enzyme';
import Adapter from 'enzyme-adapter-react-16';
import React from 'react';
import {TorrentPeers} from '../../../library/types';
import {Torrent} from '../../../types';
import {createMockTorrent, createMockTorrentPeers, testSelector} from '../../../utils/test-utils';
import {UploadInfo, UploadInfoProps} from './UploadInfo';

Enzyme.configure({adapter: new Adapter()});

type MockUploadInfo = {
  torrent: Partial<Torrent>;
  peers: TorrentPeers;
  uploadInfoWrapper: ReactWrapper<UploadInfoProps>;
  uploadingSectionElement: ReactWrapper;
  numPeersElement: ReactWrapper;
};

const mockUploadInfo = (noPeers = false): MockUploadInfo => {
  const peers = noPeers ? {} : createMockTorrentPeers();
  const torrent = createMockTorrent({
    numPeers: Object.keys(peers).length,
    originalSeed: true
  }) as Torrent;

  const uploadInfoWrapper = mount(
    <UploadInfo torrent={torrent} channelCache={{}} mySigningAddress="0x0" />
  );

  return {
    uploadInfoWrapper,
    torrent,
    peers,
    uploadingSectionElement: uploadInfoWrapper.find('.uploadingInfo'),
    numPeersElement: uploadInfoWrapper.find(testSelector('numPeers'))
  };
};

describe('<UploadInfo />', () => {
  let uploadInfo: MockUploadInfo;

  beforeEach(() => {
    uploadInfo = mockUploadInfo();
  });

  it('can be instantiated', () => {
    const {numPeersElement, torrent, uploadingSectionElement} = uploadInfo;

    expect(uploadingSectionElement.exists()).toEqual(true);
    expect(numPeersElement.exists()).toEqual(true);

    expect(numPeersElement.text()).toEqual(`${torrent.numPeers}`);
  });

  it('shows no peer info when no peers exist', () => {
    const {uploadingSectionElement} = mockUploadInfo(true);
    expect(uploadingSectionElement.exists()).toEqual(true);
  });
});
