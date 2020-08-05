import {StateChannelsErrorResponse} from '../../../../lib/src';

export const goodErrorResponses: StateChannelsErrorResponse[] = [
  {
    jsonrpc: '2.0',
    id: 1581594378830,
    error: {
      code: 500,
      message: 'Wallet error'
    }
  },
  {
    jsonrpc: '2.0',
    id: 1581594378830,
    error: {
      code: 100,
      message: 'Ethereum Not Enabled'
    }
  },
  {
    jsonrpc: '2.0',
    id: 1581594378830,
    error: {
      code: 200,
      message: 'User declined'
    }
  },
  {
    jsonrpc: '2.0',
    id: 1581594378830,
    error: {
      code: 300,
      message: 'Not your turn'
    }
  },
  {
    jsonrpc: '2.0',
    id: 1581594378830,
    error: {
      code: 301,
      message: 'Channel not found'
    }
  },
  {
    jsonrpc: '2.0',
    id: 1581594378830,
    error: {
      code: 400,
      message: 'Channel not found'
    }
  },
  {
    jsonrpc: '2.0',
    id: 1581594378830,
    error: {
      code: 401,
      message: 'Invalid transition'
    }
  },
  {
    jsonrpc: '2.0',
    id: 1581594378830,
    error: {
      code: 402,
      message: 'Invalid app data'
    }
  },
  {
    jsonrpc: '2.0',
    id: 1581594378830,
    error: {
      code: 403,
      message: 'Not your turn'
    }
  },
  {
    jsonrpc: '2.0',
    id: 1581594378830,
    error: {
      code: 404,
      message: 'Channel closed'
    }
  }
];
