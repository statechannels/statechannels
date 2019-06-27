import { DirectFundingAction } from '../../direct-funding';
import { CommitmentReceived } from '../../../actions';
// -------
// Actions
// -------

// --------
// Constructors
// --------

// --------
// Unions and Guards
// --------

export type Action = DirectFundingAction | CommitmentReceived;
