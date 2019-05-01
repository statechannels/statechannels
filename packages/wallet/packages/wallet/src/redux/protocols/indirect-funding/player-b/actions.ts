import { DirectFundingAction } from '../../direct-funding';
import { CommitmentReceived } from '../../../actions';

export type Action = DirectFundingAction | CommitmentReceived;
