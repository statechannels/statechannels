import request from 'supertest';

import app from '../app';

describe('http server', () => {
  it('can receive jsonrpc encoded calls over http post and respond', async () =>
    request(app)
      .post('/')
      .send({method: 'example', id: 1, params: {}, jsonrpc: '2.0'})
      .set('Content-Type', 'application/json')
      .expect('Content-Type', /json/)
      .expect({jsonrpc: '2.0', id: 1, result: 'hello'})
      .expect(200));
});
