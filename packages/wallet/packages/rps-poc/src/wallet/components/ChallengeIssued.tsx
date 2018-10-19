import React from 'react';


interface Props {
    expiryTime: number;
}

export default class ChallengeIssued extends React.PureComponent<Props> {
  render() {
      const { expiryTime} = this.props;
      const parsedExpiryDate = new Date(expiryTime*1000).toLocaleDateString();
    return (
      <div>
        <h1>Challenge Issued!</h1>
        <p>
        Your challenge has been issued.
        The game will automatically conclude by {parsedExpiryDate} if no action is taken.
        </p>
      </div>
    );
  }
}
