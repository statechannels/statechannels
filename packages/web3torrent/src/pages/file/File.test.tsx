import Enzyme, {mount} from 'enzyme';
import Adapter from 'enzyme-adapter-react-16';
import {createMemoryHistory} from 'history';
import React from 'react';
import {act} from 'react-dom/test-utils';
import {MemoryRouter as Router, RouteComponentProps} from 'react-router-dom';
import {EmptyTorrent} from '../../constants';
import {WebTorrentAddInput} from '../../library/types';
import {Status, Torrent} from '../../types';
import {testSelector} from '../../utils/test-utils';
import * as TorrentStatus from '../../utils/torrent-status-checker';
import * as EmbeddedWalletClient from './../../clients/embedded-wallet-client';
import * as Web3TorrentClient from './../../clients/web3torrent-client';
import File from './File';
import {JsonRpcResponse} from '@statechannels/channel-provider';

const mockFileURL =
  '/file/#magnet:?xt=urn%3Abtih%3A148c62a7f7845c91e7d16ca9be85de6fbaed3a1f&dn=test.zip&xl=1398978&cost=0';

const mockResponse: JsonRpcResponse = {jsonrpc: '2.0', id: 123, result: ''};

Enzyme.configure({adapter: new Adapter()});

function setup() {
  const history = createMemoryHistory({initialEntries: [mockFileURL]});
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

  const askForFunds = jest
    .spyOn(EmbeddedWalletClient, 'askForFunds')
    .mockImplementation(() => Promise.resolve(mockResponse));

  const torrentFile = jest
    .spyOn(Web3TorrentClient, 'download')
    .mockImplementation(_pD => Promise.resolve({...EmptyTorrent, status: Status.Connecting}));

  const component = mount(
    <Router>
      <File {...props} />
    </Router>
  );

  return {props, component, askForFunds, torrentFile};
}

describe('<File />', () => {
  let component: Enzyme.ReactWrapper;
  let askForFunds: jest.SpyInstance<Promise<JsonRpcResponse>, []>;
  let torrentFile: jest.SpyInstance<Promise<Torrent>, [WebTorrentAddInput]>;

  beforeEach(() => {
    const mock = setup();
    component = mock.component;
    askForFunds = mock.askForFunds;
    torrentFile = mock.torrentFile;
    jest.useFakeTimers();
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

  it('should run askForFunds functions when the File Button is clicked', async () => {
    await act(async () => {
      await component.find(testSelector('download-button')).simulate('click');
    });
    expect(askForFunds).toHaveBeenCalled();
    expect(torrentFile).toHaveBeenCalled();
  });

  it('should run checker function if the File Button is clicked', async () => {
    const torrentStatusChecker = jest
      .spyOn(TorrentStatus, 'default')
      .mockImplementation((_pD: Torrent, _iH: any) => EmptyTorrent);

    await act(async () => {
      await component.find(testSelector('download-button')).simulate('click');
    });

    act(() => {
      jest.runOnlyPendingTimers();
    });

    expect(torrentStatusChecker).toHaveBeenCalled();
  });
});
