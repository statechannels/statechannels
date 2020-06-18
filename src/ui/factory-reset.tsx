import React, {useState} from 'react';
import './wallet.scss';
import Dexie from 'dexie';
import {Store} from '../store';
import {logger} from '../logger';
import {DB_NAME} from '../constants';
import {track} from '../segment-analytics';

interface Props {
  store: Store;
}

export const FactoryReset = (props: Props) => {
  const [destroyed, setDestroyed] = useState(false);

  return destroyed ? (
    <div>Success! Check your console to see your old store.</div>
  ) : (
    <div>
      <div>If you press this button, we will destroy your wallet. </div>
      <div>We will dump the contents of your wallet in your console.</div>
      <div>Contact us, and we can try to recover your funds.</div>
      <button id="destroy" onClick={() => destroyStore(props.store, setDestroyed)}>
        Factory reset
      </button>
    </div>
  );
};

const destroyStore = async (store: Store, setDestroyed) => {
  track('clicked factory reset');
  if (!(await Dexie.exists(DB_NAME))) {
    logger.error('No store detected.');
    track('did not have a store');
    setDestroyed(true);
  } else if (confirm('Are you sure you want to delete your store?')) {
    track('approved factory reset');
    logger.error({store: await (store as any).backend.dump()}, 'Wallet destroyed');
    await Dexie.delete(DB_NAME);

    setDestroyed(true);
    track('destroyed store');
  } else {
    track('rejected factory reset');
  }
};
