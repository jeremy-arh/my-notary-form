import { memo } from 'react';
import PhoneInput, { isValidPhoneNumber } from 'react-phone-number-input';
import 'react-phone-number-input/style.css';

const PhoneInputWrapper = memo(({ value, onChange, className, countrySelectProps, numberInputProps, ...props }) => {
  return (
    <PhoneInput
      {...props}
      value={value || ''}
      onChange={onChange}
      className={className}
      countrySelectProps={countrySelectProps}
      numberInputProps={numberInputProps}
    />
  );
});

PhoneInputWrapper.displayName = 'PhoneInputWrapper';

export default PhoneInputWrapper;
export { isValidPhoneNumber };
