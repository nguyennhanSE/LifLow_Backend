import {
  registerDecorator,
  ValidationOptions,
  ValidatorConstraint,
  ValidatorConstraintInterface,
  ValidationArguments,
} from 'class-validator';

@ValidatorConstraint({ name: 'isAutoIssueDayOfMonth', async: false })
export class IsAutoIssueDayOfMonthConstraint implements ValidatorConstraintInterface {
  validate(value: unknown) {
    if (value == null || value === '') {
      return true;
    }
    if (typeof value === 'number') {
      return Number.isInteger(value) && value >= 1 && value <= 31;
    }
    if (typeof value === 'string') {
      const day = parseInt(value, 10);
      if (!Number.isNaN(day) && day >= 1 && day <= 31) {
        return true;
      }
      const date = new Date(value);
      return !Number.isNaN(date.getTime());
    }
    return false;
  }

  defaultMessage(_args: ValidationArguments) {
    return 'autoIssueDayOfMonth must be a valid ISO 8601 date string or a number/string 1-31 (day of month, e.g. 15, "01", "15")';
  }
}

export function IsAutoIssueDayOfMonth(validationOptions?: ValidationOptions) {
  return function (object: object, propertyName: string) {
    registerDecorator({
      target: object.constructor,
      propertyName,
      options: validationOptions,
      constraints: [],
      validator: IsAutoIssueDayOfMonthConstraint,
    });
  };
}
