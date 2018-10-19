import React from 'react';
import Button from 'reactstrap/lib/Button';
import { ChallengeResponse as ResponseOption, RespondWithMove, RespondWithAlternativeMove, Refute, Conclude } from '../domain/ChallengeResponse';
import { Signature, ConclusionProof } from '../domain';
interface Props {
    responseOptions: ResponseOption[];
    expiryTime: number;
    respondWithMove: ()=>void;
    respondWithAlternativeMove: (alternativePosition: string, alternativeSignature: Signature, response: string, responseSignature: Signature) => void;
    refute: (newerPosition: string, signature: Signature)=>void;
    conclude: (proof: ConclusionProof)=>void;
}

export default class ChallengeResponse extends React.PureComponent<Props> {
    handleRespondWithMove() {
        this.props.respondWithMove();
    }
    handleRespondWithAlternativeMove(option: RespondWithAlternativeMove) {
        this.props.respondWithAlternativeMove(option.theirPosition, option.theirSignature, option.myPosition, option.mySignature);
    }

    handleRefute(option: Refute) {
        this.props.refute(option.theirPosition, option.theirSignature);
    }

    handleConclude(option: Conclude) {
        this.props.conclude(option.conclusionProof);
    }

    render() {
        const { responseOptions, expiryTime } = this.props;
        const parsedExpiryDate = new Date(expiryTime * 1000).toLocaleDateString();
        return (
            <div>
                <h1>A challenge has been detected!</h1>
                <p>
                    A challenge has been detected! The game will automatically conclude by {parsedExpiryDate} if no action is taken.
        </p>
                <p>
                    You can take the following actions:
                    </p>
                <div>
                    {responseOptions.map(option => {
                        if (option instanceof RespondWithMove) {
                            return <Button onClick={this.handleRespondWithMove} key={option.constructor.name} >Respond with Move</Button>;
                        }
                        else if (option instanceof RespondWithAlternativeMove) {
                            return <Button onClick={() => { this.handleRespondWithAlternativeMove(option); }} key={option.constructor.name} >Respond with Alternative Move</Button>;
                        }
                        else if (option instanceof Refute) {
                            return <Button onClick={() => { this.handleRefute(option); }} key={option.constructor.name} >Refute</Button>;
                        }
                        else if (option instanceof Conclude) {
                            return <Button onClick={() => { this.handleConclude(option); }} key={option.constructor.name} >Conclude</Button>;
                        } else {
                            return null;
                        }

                    })}
                </div>
            </div>
        );

    }
}
