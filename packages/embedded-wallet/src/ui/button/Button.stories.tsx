import {storiesOf} from '@storybook/react';
import React from 'react';
import {Button} from './Button';

storiesOf('Embedded Wallet', module)
  .add('FormButton', () => (
    <Button
      type={'primary'}
      label={'primary'}
      onClick={() => {
        console.log('clicked');
      }}
    />
  ))
  .add('FormButton2', () => (
    <Button
      type={'secondary'}
      label={'secondary'}
      onClick={() => {
        console.log('clicked');
      }}
    />
  ));
