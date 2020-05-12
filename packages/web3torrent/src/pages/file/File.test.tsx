import Enzyme, {mount} from 'enzyme';
import Adapter from 'enzyme-adapter-react-16';
import React from 'react';
import {act} from 'react-dom/test-utils';
import {MemoryRouter as Router} from 'react-router-dom';
import {WebTorrentAddInput, ExtendedTorrent} from '../../library/types';
import {TorrentStaticData} from '../../types';
import {testSelector, createMockExtendedTorrent, createMockTorrentUI} from '../../utils/test-utils';
import * as TorrentStatus from '../../utils/torrent-status-checker';
import * as Web3TorrentClient from './../../clients/web3torrent-client';
import {paymentChannelClient} from '../../clients/payment-channel-client';
import File from './File';
import WebTorrentPaidStreamingClient from '../../library/web3torrent-lib';

Enzyme.configure({adapter: new Adapter()});

describe('<File />', () => {
  let component: Enzyme.ReactWrapper;
  let torrentFile: jest.SpyInstance<Promise<ExtendedTorrent>, [WebTorrentAddInput]>;

  beforeEach(() => {
    torrentFile = jest
      .spyOn(Web3TorrentClient, 'download')
      .mockImplementation(_pD => Promise.resolve(createMockExtendedTorrent()));

    jest.spyOn(paymentChannelClient, 'getChannels').mockImplementation(() => Promise.resolve({}));

    component = mount(
      <Router>
        <File ready={true} />
      </Router>
    );
    jest.useFakeTimers();
  });

  afterAll(() => {
    Web3TorrentClient.web3torrent.destroy();
  });

  it('should render an download button', () => {
    expect(component.find(testSelector('download-button')).text()).toBe('Start Download');
  });

  // TODO: Figure out how to test mocked channelClient
  // eslint-disable-next-line
  // it('should run approveBudgetAndFund functions when the File Button is clicked', async () => {
  //   await act(async () => {
  //     await component.find(testSelector('download-button')).simulate('click');
  //   });
  //   expect(ChannelClient.mock.instances[0].approveBudgetAndFund).toHaveBeenCalled();
  //   expect(torrentFile).toHaveBeenCalled();
  // });

  it('should run checker function if the File Button is clicked', async () => {
    const torrentStatusChecker = jest
      .spyOn(TorrentStatus, 'getTorrentUI')
      .mockImplementation((_w3t: WebTorrentPaidStreamingClient, _staticData: TorrentStaticData) =>
        createMockTorrentUI()
      );

    await act(async () => {
      await component.find(testSelector('download-button')).simulate('click');
    });

    act(() => {
      jest.runOnlyPendingTimers();
    });

    expect(torrentStatusChecker).toHaveBeenCalled();
  });
});
