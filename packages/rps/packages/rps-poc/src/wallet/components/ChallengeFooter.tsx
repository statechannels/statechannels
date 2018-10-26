import React from 'react';


interface Props {
  expiryTime: number;
}

export default class ChallengeFooter extends React.PureComponent<Props> {
  render() {
    const { expiryTime } = this.props;
    const parsedExpiryDate = new Date(expiryTime * 1000).toLocaleDateString();
    return (
      <div className="top-level-container">
        {this.props.children}
        <div className="text-center">
          <p className="challenge-text">
          A challenge is ongoing. A game will automatically conclude by {parsedExpiryDate} if no action is taken.
        </p>
        </div>
      </div>
    );
  }
}
