export type InputChangeProps = {
  validity: {
    valid: boolean;
    error?: string;
  };
  inputName: string;
  event?: React.ChangeEvent<HTMLInputElement>;
  value?: number | string | boolean;
};

export type FormButtonProps = {
  className?: string;
  name?: string;
  spinner?: boolean;
  children?: React.ReactNode;
  disabled?: boolean;
  block?: boolean;
  onClick?: (event: React.MouseEvent<HTMLButtonElement, MouseEvent>) => void;
  type?: 'submit' | 'button';
};

export const errorStatus = (type?: string) => ({
  valid: {message: null},
  valueMissing: {message: 'Please fill out this field.'},
  typeMismatch: {message: `Please fill in a valid ${type}`},
  tooShort: {message: 'Please lengthen this text.'},
  tooLong: {message: 'Please shorten this text.'},
  badInput: {message: 'Please enter a number.'},
  stepMismatch: {message: 'Please select a valid value.'},
  rangeOverflow: {message: 'Please select a smaller value.'},
  rangeUnderflow: {message: 'Please select a larger value.'},
  patternMismatch: {message: 'Please match the requested format.'}
});
