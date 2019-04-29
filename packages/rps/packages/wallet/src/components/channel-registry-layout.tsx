import * as states from '../redux/state';
import React, { PureComponent } from 'react';
import { connect } from 'react-redux';

interface Props {
  state: states.Initialized;
}

// TODO: This component is unused
class ChannelRegistryLayout extends PureComponent<Props> {
  render() {
    const channels = this.props.state.channelStore;
    const channelList: string[] = [];
    for (const key in channels) {
      if (key) {
        channelList.push(key);
      }
    }
    const renderRow = name => (
      <tr>
        <td>{name}</td>
        <td>/</td>
        <td>/</td>
      </tr>
    );
    return (
      <div>
        <div style={{ borderBottom: '1px solid rgba(0, 0, 0, 0.1)' }}>
          <i>Ledger Channels </i>
        </div>
        <div style={{ borderBottom: '1px solid rgba(0, 0, 0, 0.1)' }}>
          <table style={{ width: '100%' }}>
            <tbody>
              <tr>
                <th>Channel</th>
                <th>Counterparties</th>
                <th>Funded?</th>
              </tr>
              {channelList.map(renderRow)}
              <tr>
                <td>RPS</td>
                <td>Bob</td>
                <td>✗</td>
              </tr>
              <tr>
                <td>TTT</td>
                <td>Charlie</td>
                <td>✗</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    );
  }
}
export default connect(() => ({}))(ChannelRegistryLayout);
