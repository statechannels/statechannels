import * as request from 'supertest';
import app from '../../hub/app';

describe('routes: index', () => {
  test('should respond as expected', async () => {
    const response = await request(app.callback()).get('/');
    expect(response.status).toEqual(200);
    expect(response.type).toEqual('application/json');
    expect(response.body.data).toEqual(
      'Welcome to the Nitro hub, where everything happens REALLY fast!',
    );
  });
});
