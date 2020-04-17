import * as firebase from 'firebase/app';

import 'firebase/database';

import ReduxSagaFirebase from 'redux-saga-firebase';
import {fireBaseConfig} from '../constants';

const fire = firebase.initializeApp(fireBaseConfig);

export const reduxSagaFirebase = new ReduxSagaFirebase(fire);

export default fire;

export const serverTimestamp = firebase.database.ServerValue.TIMESTAMP;
