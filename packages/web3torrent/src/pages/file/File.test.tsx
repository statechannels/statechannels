import Enzyme, {mount} from 'enzyme';
import Adapter from 'enzyme-adapter-react-16';
import React from 'react';
import {act} from 'react-dom/test-utils';
import {MemoryRouter as Router} from 'react-router-dom';
import {WebTorrentAddInput, ExtendedTorrent} from '../../library/types';
import {TorrentStaticData} from '../../types';
import {testSelector, createMockExtendedTorrent, createMockTorrentUI} from '../../utils/test-utils';
import * as TorrentStatus from '../../utils/torrent-status-checker';

import File from './File';
import {
  mockTorrentClientContext,
  MockContextProvider
} from '../../library/testing/mock-context-provider';

Enzyme.configure({adapter: new Adapter()});

describe('<File />', () => {
  let component: Enzyme.ReactWrapper;

  beforeEach(() => {
    mockTorrentClientContext.upload = _pD => Promise.resolve(createMockExtendedTorrent());
    mockTorrentClientContext.getTorrentUI = jest
      .fn()
      .mockImplementation(() => createMockTorrentUI());
    component = mount(
      <Router>
        <MockContextProvider>
          <File ready={true} />
        </MockContextProvider>
      </Router>
    );
    jest.useFakeTimers();
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
    await act(async () => {
      await component.find(testSelector('download-button')).simulate('click');
    });

    act(() => {
      jest.runOnlyPendingTimers();
    });

    expect(mockTorrentClientContext.getTorrentUI).toHaveBeenCalled();
  });
});
