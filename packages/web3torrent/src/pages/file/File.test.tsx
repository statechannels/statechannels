import Enzyme, {mount} from 'enzyme';
import Adapter from 'enzyme-adapter-react-16';
import React from 'react';
import {act} from 'react-dom/test-utils';
import {MemoryRouter as Router} from 'react-router-dom';
import {EmptyTorrent} from '../../constants';
import {WebTorrentAddInput} from '../../library/types';
import {Status, Torrent} from '../../types';
import {testSelector} from '../../utils/test-utils';
import * as TorrentStatus from '../../utils/torrent-status-checker';
import * as Web3TorrentClient from './../../clients/web3torrent-client';
import File from './File';

Enzyme.configure({adapter: new Adapter()});

jest.mock('@statechannels/channel-client');

describe('<File />', () => {
  let component: Enzyme.ReactWrapper;
  let torrentFile: jest.SpyInstance<Promise<Torrent>, [WebTorrentAddInput]>;

  beforeEach(() => {
    torrentFile = jest
      .spyOn(Web3TorrentClient, 'download')
      .mockImplementation(_pD => Promise.resolve({...EmptyTorrent, status: Status.Connecting}));

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

  it("should change the label to 'Preparing file' and show a spinner when clicked", async () => {
    const fileButton = component.find(testSelector('download-button'));

    await act(async () => {
      await fileButton.simulate('click');
    });

    expect(fileButton.text()).toEqual('Preparing Download...');

    /**
     * @todo This should be done with `fileButton.find(Spinner)`, but for some
     * reason it is not working.
     */
    expect(fileButton.html().includes('class="spinner')).toEqual(true);
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
      .spyOn(TorrentStatus, 'torrentStatusChecker')
      .mockImplementation((_w3t: any, _pD: Torrent, _iH: any) => EmptyTorrent);

    await act(async () => {
      await component.find(testSelector('download-button')).simulate('click');
    });

    act(() => {
      jest.runOnlyPendingTimers();
    });

    expect(torrentStatusChecker).toHaveBeenCalled();
  });
});
