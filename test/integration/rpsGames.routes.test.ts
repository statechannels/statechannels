process.env.NODE_ENV = 'test';

import * as supertest from 'supertest';
import app from '../../src/app/app';
import { HUB_ADDRESS, NAME, STAKE } from '../../src/constants';
import * as rpsArtifact from '../../src/contracts/prebuilt_contracts/RockPaperScissorsGame.json';

const BASE_URL = '/api/v1/rps_games';

describe('routes : rps_channels', () => {
  describe('Get: ', () => {
    it('returns a list of games it will play', async () => {
      const response = await supertest(app.callback()).get(BASE_URL);

      expect(response.status).toEqual(200);
      expect(response.body).toMatchObject({
        address: HUB_ADDRESS,
        games: [
          {
            rules_address: rpsArtifact.networks['3'].address,
            stake: STAKE,
            name: NAME,
          },
        ],
      });
    });
  });
});
