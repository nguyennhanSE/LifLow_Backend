import {
  registerDecorator,
  ValidationOptions,
  ValidationArguments,
  ValidatorConstraint,
  ValidatorConstraintInterface,
} from 'class-validator';

@ValidatorConstraint({ name: 'isBeforeEndDate', async: false })
export class IsBeforeEndDateConstraint implements ValidatorConstraintInterface {
  validate(startDate: string, args: ValidationArguments) {
    const object = args.object as any;
    const endDate = object.endDate;

    if (!startDate || !endDate) {
      return true; // Let @IsNotEmpty handle this
    }

    const start = new Date(startDate);
    const end = new Date(endDate);

    return start < end;
  }

  defaultMessage(args: ValidationArguments) {
    return 'startDate must be before endDate';
  }
}

export function IsBeforeEndDate(validationOptions?: ValidationOptions) {
  return function (object: Object, propertyName: string) {
    registerDecorator({
      target: object.constructor,
      propertyName: propertyName,
      options: validationOptions,
      constraints: [],
      validator: IsBeforeEndDateConstraint,
    });
  };
}

