process.env.NODE_ENV = 'test';

import * as supertest from 'supertest';
import app from '../../src/app/app';
import {
  invalid_open_channel_params,
  open_channel_params,
  pre_fund_setup_1_response,
} from '../../src/test/test_data';
import errors from '../../src/wallet/errors';

const BASE_URL = '/api/v1/ledger_channels';

describe('routes : ledger_channels', () => {
  describe('POST: ', () => {
    describe('when the commitment is invalid', () => {
      it('responds with an error', async () => {
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
        it.skip('returns 400', () => {
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
        it.skip('responds with a signed post-fund setup commitment when the channel is funded', async () => {
          expect.assertions(1);
        });
      });

      describe('when the commitment type is app', () => {});

      describe('when the commitment type is conclude', () => {});
    });
  });
});
