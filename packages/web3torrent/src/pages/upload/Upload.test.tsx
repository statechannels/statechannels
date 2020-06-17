import Enzyme, {mount} from 'enzyme';
import Adapter from 'enzyme-adapter-react-16';
import React from 'react';
import {act} from 'react-dom/test-utils';
import {MemoryRouter as Router} from 'react-router-dom';
import {WebTorrentSeedInput, ExtendedTorrent} from '../../library/types';
import * as Web3TorrentClient from './../../clients/web3torrent-client';
import Upload from './Upload';
import {mockMetamask} from '../../library/testing/test-utils';
import {createMockExtendedTorrent} from '../../utils/test-utils';
import {Status} from '../../types';
Enzyme.configure({adapter: new Adapter()});

const mockTorrent = createMockExtendedTorrent();

describe('<Upload />', () => {
  let component: Enzyme.ReactWrapper;
  let torrentUpload: jest.SpyInstance<Promise<ExtendedTorrent>, [WebTorrentSeedInput]>;
  beforeAll(() => {
    mockMetamask();
  });

  beforeEach(() => {
    torrentUpload = jest
      .spyOn(Web3TorrentClient, 'upload')
      .mockImplementation(() => Promise.resolve({...mockTorrent, status: Status.Seeding}));
    component = mount(
      <Router>
        <Upload ready={true} />
      </Router>
    );

    jest.useFakeTimers();
  });

  afterAll(() => {
    Web3TorrentClient.web3TorrentClient.destroy();
  });

  it('should render an Upload button', () => {
    expect(component.find('input.inputfile').exists()).toBe(true);
  });

  it('should run askForFunds functions when the Upload Button is clicked', async () => {
    await act(async () => {
      await component.find('input.inputfile').simulate('change', {
        target: {
          files: ['dummyValue.something']
        }
      });
    });
    expect(torrentUpload).toHaveBeenCalled();
  });
});
