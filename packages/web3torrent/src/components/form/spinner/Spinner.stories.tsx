import {withActions} from '@storybook/addon-actions';
import {optionsKnob, withKnobs} from '@storybook/addon-knobs';
import {storiesOf} from '@storybook/react';
import React from 'react';
// @ts-ignore
import markdown from './README.md';
import {Spinner} from './Spinner';

storiesOf('Web3Torrent', module)
  .addDecorator(withKnobs())
  .addDecorator(withActions('click'))
  .add(
    'Spinner',
    () => (
      <div style={{background: '#eee', padding: '20px'}}>
        <Spinner
          type={optionsKnob(
            'Type',
            {Circle: 'circle', Dots: 'dots'},
            'circle',
            {display: 'inline-radio'},
            'Appearance'
          )}
          visible={true}
          color={optionsKnob(
            'Color (only valid for "circle" type)',
            {Black: 'black', White: 'white', Orange: 'orange'},
            'black',
            {display: 'inline-radio'},
            'Appearance'
          )}
        ></Spinner>
      </div>
    ),
    {
      notes: {markdown}
    }
  );
