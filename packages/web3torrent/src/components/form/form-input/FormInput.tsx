import React from 'react';
import {errorStatus, ExtendedFormInputProps, FormInputProps} from '../types';
import './FormInput.scss';

class FormInput extends React.Component<FormInputProps, ExtendedFormInputProps> {
  constructor(props: FormInputProps) {
    super(props);
    this.state = {
      lastChangeEvent: undefined,
      value: props.value || '',
      error: props.error,
      valid: !!(props.error || (props.required && props.value !== undefined))
    };
  }

  handleChange(event: React.ChangeEvent<HTMLInputElement>) {
    const {type, disabled, error, change, name} = this.props;
    const inputError = error || this.getError(event.target.validity, type, disabled);
    if (change) {
      change({
        event,
        validity: {
          error: error as string,
          valid: !inputError
        },
        inputName: name as string,
        value: event.target.value
      });
    }
    this.setState({
      lastChangeEvent: event,
      error: inputError,
      value: event.target.value,
      valid: !inputError
    });
  }

  getError(validity: ValidityState, type?: string, disabled?: boolean): string | undefined {
    if (disabled || type === 'file') {
      return '';
    }
    for (const errorType in validity) {
      if (validity[errorType]) {
        return errorStatus(type)[errorType].message;
      }
    }
    return 'The value you entered for this field is invalid.';
  }

  render() {
    const {
      className,
      name,
      label,
      max,
      min,
      step,
      type,
      units,
      disabled,
      required,
      autofocus
    } = this.props as FormInputProps;
    const {value, error} = this.state;
    return (
      <label className={className}>
        <div className="label">{label}</div>
        {required}
        <div className={disabled ? 'input-container disabled' : 'input-container'}>
          <input
            data-test-selector={`${name || type}-input`}
            name={name || 'input'}
            className="input"
            autoFocus={autofocus || false}
            disabled={disabled || false}
            required={required || false}
            type={type || 'text'}
            value={value}
            max={max || Infinity}
            min={isNaN(min as number) ? -Infinity : min}
            step={step || 1}
            onBlur={event => this.handleChange(event)}
            onChange={event => this.handleChange(event)}
          />
          {Array.isArray(units) && units.length === 1 ? (
            <div className="unit">{units[0].shortName}</div>
          ) : null}
        </div>
        {error ? (
          <div className="error" data-test-selector={`error-${name || type}-input}`}>
            {error}
          </div>
        ) : null}
      </label>
    );
  }
}

export {FormInput};
