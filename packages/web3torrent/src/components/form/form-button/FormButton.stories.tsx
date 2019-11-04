import {action, withActions} from '@storybook/addon-actions';
import {boolean, optionsKnob, text, withKnobs} from '@storybook/addon-knobs';
import {storiesOf} from '@storybook/react';
import React from 'react';
import {FormButton} from './FormButton';
// @ts-ignore
import markdown from './README.md';

storiesOf('Web3Torrent', module)
  .addDecorator(withKnobs())
  .addDecorator(withActions('click'))
  .add(
    'FormButton',
    () => (
      <FormButton
        disabled={boolean('Disabled', false, 'Appearance')}
        type={optionsKnob(
          'Type',
          {Button: 'button', Submit: 'submit'},
          'button',
          {
            display: 'inline-radio'
          },
          'Appearance'
        )}
        block={boolean('Full width', false, 'Appearance')}
        spinner={boolean('Show spinner', false, 'Behavior')}
        onClick={action('form-button-click')}
      >
        {text('Label', 'Click me', 'Appearance')}
      </FormButton>
    ),
    {
      notes: {markdown}
    }
  );
