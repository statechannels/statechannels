import Enzyme, {mount, ReactWrapper} from 'enzyme';
import Adapter from 'enzyme-adapter-react-16';
import prettier from 'prettier-bytes';
import React from 'react';
import {TorrentPeers} from '../../../library/types';
import {Torrent} from '../../../types';
import {createMockTorrent, createMockTorrentPeers, testSelector} from '../../../utils/test-utils';
import {UploadInfo, UploadInfoProps} from './UploadInfo';
import {calculateWei} from '../../../utils/calculateWei';

Enzyme.configure({adapter: new Adapter()});

type ElementsByLeecher = {
  [key: string]: {
    leecherInfoWrapper: ReactWrapper;
    leecherIdElement: ReactWrapper;
    leecherDownloadedElement: ReactWrapper;
    leecherPaid: ReactWrapper;
  };
};

type MockUploadInfo = {
  torrent: Partial<Torrent>;
  peers: TorrentPeers;
  uploadInfoWrapper: ReactWrapper<UploadInfoProps>;
  uploadingSectionElement: ReactWrapper;
  numPeersElement: ReactWrapper;
  leechersSectionElement: ReactWrapper;
  leechersInfo: ElementsByLeecher;
};

const mockUploadInfo = (noPeers = false): MockUploadInfo => {
  const peers = noPeers ? {} : createMockTorrentPeers();
  const torrent = createMockTorrent({numPeers: Object.keys(peers).length}) as Torrent;

  const uploadInfoWrapper = mount(<UploadInfo torrent={torrent} peers={peers} />);

  return {
    uploadInfoWrapper,
    torrent,
    peers,
    uploadingSectionElement: uploadInfoWrapper.find('.uploadingInfo'),
    numPeersElement: uploadInfoWrapper.find(testSelector('numPeers')),
    leechersSectionElement: uploadInfoWrapper.find('.leechersInfo'),
    leechersInfo: Object.values(peers)
      .map(peer => {
        const leecherInfoWrapper = uploadInfoWrapper.findWhere(node => node.key() === peer.id);
        return {
          [peer.id]: {
            leecherInfoWrapper,
            leecherIdElement: leecherInfoWrapper.find('.leecher-id'),
            leecherDownloadedElement: leecherInfoWrapper.find('.leecher-downloaded'),
            leecherPaid: leecherInfoWrapper.find('.leecher-paid')
          }
        } as ElementsByLeecher;
      })
      .reduce((accumulated, value) => ({...accumulated, ...value}), {})
  };
};

describe('<UploadInfo />', () => {
  let uploadInfo: MockUploadInfo;

  beforeEach(() => {
    uploadInfo = mockUploadInfo();
  });

  it('can be instantiated', () => {
    const {leechersSectionElement, numPeersElement, torrent, uploadingSectionElement} = uploadInfo;

    expect(uploadingSectionElement.exists()).toEqual(true);
    expect(numPeersElement.exists()).toEqual(true);
    expect(leechersSectionElement.exists()).toEqual(true);

    expect(numPeersElement.text()).toEqual(`${torrent.numPeers}`);
    expect(leechersSectionElement.children().length).toEqual(torrent.numPeers);
  });

  it('shows no peer info when no peers exist', () => {
    const {leechersSectionElement, uploadingSectionElement} = mockUploadInfo(true);

    expect(uploadingSectionElement.exists()).toEqual(true);
    expect(leechersSectionElement.exists()).toEqual(true);
    expect(leechersSectionElement.children().length).toEqual(0);
  });

  it.each([Object.keys(createMockTorrentPeers())])(
    'can render leecher info for peer %s',
    peerId => {
      const {uploaded} = uploadInfo.peers[peerId].wire;
      const {
        leecherInfoWrapper,
        leecherIdElement,
        leecherDownloadedElement,
        leecherPaid
      } = uploadInfo.leechersInfo[peerId];

      expect(leecherInfoWrapper.exists()).toEqual(true);
      expect(leecherIdElement.exists()).toEqual(true);
      expect(leecherDownloadedElement.exists()).toEqual(true);
      expect(leecherPaid.exists()).toEqual(true);

      expect(leecherIdElement.text()).toEqual(`#${peerId}...`);
      expect(leecherDownloadedElement.text()).toEqual(prettier(uploaded));
      expect(leecherPaid.text()).toEqual(`$${calculateWei(uploaded)}`);
    }
  );
});
