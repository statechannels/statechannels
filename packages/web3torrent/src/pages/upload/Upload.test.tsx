import Enzyme, {mount} from 'enzyme';
import Adapter from 'enzyme-adapter-react-16';
import {createMemoryHistory} from 'history';
import React from 'react';
import {act} from 'react-dom/test-utils';
import {MemoryRouter as Router, RouteComponentProps} from 'react-router-dom';
import {EmptyTorrent} from '../../constants';
import {WebTorrentSeedInput} from '../../library/types';
import {Status, Torrent} from '../../types';
import {testSelector} from '../../utils/test-utils';
import * as TorrentStatus from '../../utils/torrent-status-checker';
import * as Web3TorrentClient from './../../clients/web3torrent-client';
import Upload from './Upload';

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
      <Upload {...props} />
    </Router>
  );

  return {props, component, torrentUpload};
}

describe('<Upload />', () => {
  let component: Enzyme.ReactWrapper;
  let torrentUpload: jest.SpyInstance<Promise<Torrent>, [WebTorrentSeedInput]>;

  beforeEach(() => {
    const mock = setup();
    component = mock.component;
    torrentUpload = mock.torrentUpload;
    jest.useFakeTimers();
  });

  it('should render an Upload button', () => {
    expect(component.find(testSelector('start-button')).text()).toBe('Start');
  });

  it('should run askForFunds functions when the Upload Button is clicked', async () => {
    await act(async () => {
      await component.find(testSelector('start-button')).simulate('click');
    });
    expect(torrentUpload).toHaveBeenCalled();
  });

  it('should run checker function if the Upload Button is clicked', async () => {
    const torrentStatusChecker = jest
      .spyOn(TorrentStatus, 'default')
      .mockImplementation((_pD: Torrent, _iH: any) => EmptyTorrent);

    await act(async () => {
      await component.find(testSelector('start-button')).simulate('click');
    });

    act(() => {
      jest.runOnlyPendingTimers();
    });

    expect(torrentStatusChecker).toHaveBeenCalled();
  });
});
