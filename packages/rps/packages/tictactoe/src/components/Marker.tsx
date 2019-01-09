import React from 'react';
// import { Marks } from '../core/marks'
import { Marker } from '../core/results';

interface Props {
  you: Marker;
}

export class YourMarker extends React.PureComponent<Props> {
  renderYou(you: Marker) {
    if (you === Marker.crosses) {
      return (<span className="xs dark">&nbsp;×&nbsp;</span>);
    }
    if (you === Marker.noughts) {
      return (<span className="os dark">&nbsp;○&nbsp;</span>);
    } else { return (<span className="blank dark">&nbsp;&nbsp;&nbsp;</span>); }
  }
  render() {
    const { you } = this.props;
    return (<span className="status">
      {this.renderYou(you)}
    </span>
    );
  }
}

export class TheirMarker extends React.PureComponent<Props> {
  renderYou(you: Marker) {
    if (you === Marker.noughts) {
      return (<span className="xs dark">&nbsp;×&nbsp;</span>);
    }
    if (you === Marker.crosses) {
      return (<span className="os dark">&nbsp;○&nbsp;</span>);
    } else { return (<span className="blank dark">&nbsp;&nbsp;&nbsp;</span>); }
  }
  render() {
    const { you } = this.props;
    return (<span className="status">
      {this.renderYou(you)}
    </span>
    );
  }
}