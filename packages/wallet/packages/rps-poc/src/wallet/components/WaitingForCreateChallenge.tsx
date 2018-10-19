import React from 'react';

export default class WaitingForCreateChallenge extends React.PureComponent<{}> {
    render() {
        return (
            <div>
                <h1>Waiting for Challenge Creation</h1>
                <p>
                    Waiting for the challenge transaction to be recorded.
        </p>
            </div>
        );
    }
}