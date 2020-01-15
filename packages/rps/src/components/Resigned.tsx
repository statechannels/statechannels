import * as React from 'react';
import {Button} from 'reactstrap';
import {GameLayout} from './GameLayout';

interface Props {
  iResigned: boolean;
  channelClosed: boolean;
  action: () => void;
}

export default class Resigned extends React.PureComponent<Props> {
  render() {
    return (
      <GameLayout>
        <div className="w-100 text-center">
          <h1 className="mb-5">
            {this.props.iResigned && 'You resigned'}
            {!this.props.iResigned && 'Your opponent resigned'}
          </h1>
          <Button
            className="cog-button"
            onClick={this.props.action}
            disabled={!this.props.channelClosed}
          >
            {'OK'}
          </Button>
          <br />
          {!this.props.channelClosed && 'Waiting for your opponent...'}
        </div>
      </GameLayout>
    );
  }
}
