import Enzyme, {mount} from 'enzyme';
import Adapter from 'enzyme-adapter-react-16';
import React from 'react';
import {act} from 'react-dom/test-utils';
import {MemoryRouter as Router} from 'react-router-dom';
import {EmptyTorrent} from '../../constants';
import {WebTorrentSeedInput} from '../../library/types';
import {Status, Torrent} from '../../types';
import * as Web3TorrentClient from './../../clients/web3torrent-client';
import Upload from './Upload';
import {mockMetamask} from '../../library/testing/test-utils';

Enzyme.configure({adapter: new Adapter()});

describe('<Upload />', () => {
  let component: Enzyme.ReactWrapper;
  let torrentUpload: jest.SpyInstance<Promise<Torrent>, [WebTorrentSeedInput]>;

  beforeAll(() => {
    mockMetamask();
  });

  beforeEach(() => {
    torrentUpload = jest
      .spyOn(Web3TorrentClient, 'upload')
      .mockImplementation(_pD => Promise.resolve({...EmptyTorrent, status: Status.Seeding}));
    component = mount(
      <Router>
        <Upload ready={true} />
      </Router>
    );

    jest.useFakeTimers();
  });

  afterAll(() => {
    Web3TorrentClient.web3torrent.destroy();
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
