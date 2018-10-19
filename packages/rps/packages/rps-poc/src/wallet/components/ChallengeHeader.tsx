import React from 'react';


interface Props {
    expiryTime: number;
}

export default class ChallengeHeader extends React.PureComponent<Props> {
    render() {
        const { expiryTime } = this.props;
        const parsedExpiryDate = new Date(expiryTime * 1000).toLocaleDateString();
        return (
            <div>
                <div>
                    A challenge is ongoing.
        The game will automatically conclude by {parsedExpiryDate} if no action is taken.
      </div>
            {this.props.children}
            </div>

        );
    }
}
