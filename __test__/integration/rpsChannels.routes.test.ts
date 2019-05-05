process.env.NODE_ENV = 'test';

import * as supertest from 'supertest';
import app from '../../src/app/app';
import {
  invalid_open_channel_params,
  open_channel_params,
  post_fund_setup_1_response,
  pre_fund_setup_1_response,
  update_channel_params,
} from '../../src/test/rps_test_data';
import errors from '../../src/wallet/errors';

const BASE_URL = '/api/v1/rps_channels';

describe('routes : rps_channels', () => {
  describe('POST: ', () => {
    describe('when the commitment is invalid', () => {
      it.skip('responds with an error', async () => {
        // Signature is currently not checked
        const response = await supertest(app.callback())
          .post(BASE_URL)
          .send(invalid_open_channel_params);

        expect(response.status).toEqual(400);
        expect(response.body.status).toEqual('error');
        expect(response.body.message).toEqual(
          errors.COMMITMENT_NOT_SIGNED.message,
        );
      });
    });

    describe("when the channel doesn't exist", () => {
      describe('when the number of participants is not 2', () => {
        it.skip('returns 400', async () => {
          expect.assertions(1);
        });
      });

      it('should create a new allocator channel and responds with a signed prefund setup commitment', async () => {
        const response = await supertest(app.callback())
          .post(BASE_URL)
          .send(open_channel_params);

        expect(response.status).toEqual(201);
        expect(response.type).toEqual('application/json');

        const { commitment } = response.body;

        expect(pre_fund_setup_1_response).toMatchObject(commitment);
      });
    });

    describe('when the channel exists', () => {
      describe('when the commitment type is post-fund setup', () => {
        it('responds with a signed post-fund setup commitment when the channel', async () => {
          // (It assumes the channel is funded)
          const response = await supertest(app.callback())
            .post(BASE_URL)
            .send(update_channel_params);

          expect(response.status).toEqual(201);
          expect(response.type).toEqual('application/json');

          const { commitment } = response.body;

          expect(post_fund_setup_1_response).toMatchObject(commitment);
        });
      });

      describe.skip('when the commitment type is app', () => {});

      describe.skip('when the commitment type is conclude', () => {});
    });
  });
});
