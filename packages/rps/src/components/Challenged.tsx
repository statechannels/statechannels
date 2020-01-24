import * as React from 'react';
import {Button} from 'reactstrap';
import {GameLayout} from './GameLayout';

interface Props {
  iChallenged: boolean;
  channelClosed: boolean;
  action: () => void;
}

export default class Challenged extends React.PureComponent<Props> {
  render() {
    return (
      <GameLayout>
        <div className="w-100 text-center">
          <h1 className="mb-5">
            {this.props.iChallenged && 'You challenged'}
            {!this.props.iChallenged && 'Your opponent challenged'}
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
