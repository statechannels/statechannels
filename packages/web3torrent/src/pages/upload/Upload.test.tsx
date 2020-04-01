import Enzyme, {mount} from 'enzyme';
import Adapter from 'enzyme-adapter-react-16';
import {createMemoryHistory} from 'history';
import React from 'react';
import {act} from 'react-dom/test-utils';
import {MemoryRouter as Router, RouteComponentProps} from 'react-router-dom';
import {EmptyTorrent} from '../../constants';
import {WebTorrentSeedInput} from '../../library/types';
import {Status, Torrent} from '../../types';
import * as Web3TorrentClient from './../../clients/web3torrent-client';
import Upload from './Upload';
import {mockMetamask} from '../../library/testing/test-utils';

Enzyme.configure({adapter: new Adapter()});

function setup() {
  const history = createMemoryHistory({initialEntries: ['/upload']});
  const props: RouteComponentProps = {
    history,
    location: history.location,
    match: {
      isExact: true,
      params: {},
      path: '/',
      url: 'http://localhost/'
    }
  };

  const torrentUpload = jest
    .spyOn(Web3TorrentClient, 'upload')
    .mockImplementation(_pD => Promise.resolve({...EmptyTorrent, status: Status.Seeding}));

  const component = mount(
    <Router>
      <Upload {...props} ready={true} />
    </Router>
  );

  return {props, component, torrentUpload};
}

describe('<Upload />', () => {
  let component: Enzyme.ReactWrapper;
  let torrentUpload: jest.SpyInstance<Promise<Torrent>, [WebTorrentSeedInput]>;

  beforeAll(() => {
    mockMetamask();
  });

  beforeEach(() => {
    const mock = setup();
    component = mock.component;
    torrentUpload = mock.torrentUpload;
    jest.useFakeTimers();
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
