import Enzyme, {mount} from 'enzyme';
import Adapter from 'enzyme-adapter-react-16';
import React from 'react';
import {MemoryRouter as Router} from 'react-router-dom';
import {testSelector} from '../../utils/test-utils';
import * as Web3TorrentClient from './../../clients/web3torrent-client';
import {paymentChannelClient} from '../../clients/payment-channel-client';
import File from './File';

Enzyme.configure({adapter: new Adapter()});

describe('<File />', () => {
  let component: Enzyme.ReactWrapper;

  beforeEach(() => {
    jest.spyOn(paymentChannelClient, 'getChannels').mockImplementation(() => Promise.resolve({}));

    component = mount(
      <Router>
        <File ready={true} />
      </Router>
    );
  });

  afterAll(() => {
    Web3TorrentClient.web3TorrentClient.destroy();
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
});
