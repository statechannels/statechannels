import request from 'supertest';

import app from '../app';

describe('http server', () => {
  it('can receive jsonrpc encoded calls over http post', async () => {
    return request(app)
      .post('/')
      .send(JSON.stringify({method: 'example', id: 1, params: {}, jsonrpc: '2.0'}))
      .set('Content-Type', 'application/json')
      .expect('Content-Type', /json/)
      .expect(200);
  });
});
