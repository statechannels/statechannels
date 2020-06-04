import React from 'react';
import './wallet.scss';
import Dexie from 'dexie';
import {Store} from '../store';
import {logger} from '../logger';
import {DB_NAME} from '../constants';

interface Props {
  store: Store;
}

export const FactoryReset = (props: Props) => (
  <button id="destroy" onClick={() => destroyStore(props.store)}>
    Factory reset
  </button>
);

const destroyStore = async (store: Store) => {
  if (confirm('Are you sure you want to delete your store?')) {
    logger.error({store: await (store as any).backend.dump()}, 'Wallet destroyed');
    await Dexie.delete(DB_NAME);
  }
};
