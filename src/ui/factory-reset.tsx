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
  <div>
    <div>If you press this button, we will destroy your wallet. </div>
    <div>We will dump the contents of your wallet in your console.</div>
    <div>Contact us, and we can try to recover your funds.</div>
    <button id="destroy" onClick={() => destroyStore(props.store)}>
      Factory reset
    </button>
  </div>
);

const destroyStore = async (store: Store) => {
  if (confirm('Are you sure you want to delete your store?')) {
    logger.error({store: await (store as any).backend.dump()}, 'Wallet destroyed');
    await Dexie.delete(DB_NAME);
    window.location.reload();
  }
};
