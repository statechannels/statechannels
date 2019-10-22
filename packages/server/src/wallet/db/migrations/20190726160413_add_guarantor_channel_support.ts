import * as Knex from 'knex';
import { addAddressCheck } from '../utils';

exports.up = (knex: Knex) => {
  return knex.schema
    .table('channels', table => {
      table.string('guaranteed_channel').nullable();
    })
    .then(() => {
      return addAddressCheck(knex, 'channels', 'guaranteed_channel');
    })
    .then(() => {
      knex.raw(`\
      CREATE OR REPLACE FUNCTION doesAllocationExist(channel_id varchar(255))\
      RETURNS bool AS\
      $func$\
        SELECT NOT EXISTS (SELECT 1 FROM allocations WHERE channel_id = $1);\
      $func$  LANGUAGE sql STABLE;\

      ALTER TABLE channels ADD CONSTRAINT guarantorOrAllocator\
      CHECK (doesAllocationExist(channel_id) OR guaranteed_channel is NULL) NOT VALID; 
  `);
    });
};

exports.down = (knex: Knex) => {
  return knex.schema.table('channels', table => {
    table.dropColumn('guaranteed_channel');
  });
};
