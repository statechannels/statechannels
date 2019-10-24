import Enzyme, {mount} from 'enzyme';
import Adapter from 'enzyme-adapter-react-16';
import React from 'react';
import {TorrentFile} from 'webtorrent';
import {createMockTorrent} from '../../../utils/test-utils';
import {DownloadLink} from './DownloadLink';

Enzyme.configure({adapter: new Adapter()});

describe('<DownloadLink />', () => {
  let component: Enzyme.ReactWrapper;

  beforeAll(() => {
    document.execCommand = jest.fn(() => true);
    component = mount(<DownloadLink torrent={createMockTorrent()} />);
  });

  it('by default should be hidden', () => {
    expect(component.find('.button').exists()).toBe(false);
  });

  it('by default should be hidden', () => {
    expect(component.find('.button').exists()).toBe(false);
  });

  it('can show a Save Download link when finished', () => {
    const mockTorrent = createMockTorrent({
      downloaded: 128913,
      done: true,
      files: [({getBlobURL: resolve => resolve(null, 'blob')} as unknown) as TorrentFile]
    });
    component = mount(<DownloadLink torrent={mockTorrent} />);

    const downloadLink = component.find('.button');
    expect(downloadLink.exists()).toEqual(true);
    expect(downloadLink.prop('href')).toEqual('blob');
    expect(downloadLink.prop('download')).toEqual(mockTorrent.name);
    expect(downloadLink.text()).toEqual('Save Download');
  });
});
