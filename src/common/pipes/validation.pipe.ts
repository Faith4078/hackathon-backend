import { BadRequestException, ValidationPipe } from '@nestjs/common';
import type { ValidationError } from 'class-validator';

export interface FieldError {
  property: string;
  message: string;
}

// Flattens nested errors into one entry per failed constraint, using a
// dotted path (e.g. "address.city") for nested properties.
function flattenErrors(
  errors: ValidationError[],
  parentPath = '',
): FieldError[] {
  return errors.flatMap((error) => {
    const property = parentPath
      ? `${parentPath}.${error.property}`
      : error.property;
    const own = Object.values(error.constraints ?? {}).map((message) => ({
      property,
      message,
    }));
    return [...own, ...flattenErrors(error.children ?? [], property)];
  });
}

export const createValidationPipe = () =>
  new ValidationPipe({
    whitelist: true,
    forbidNonWhitelisted: true,
    transform: true,
    exceptionFactory: (errors) =>
      new BadRequestException(flattenErrors(errors)),
  });
