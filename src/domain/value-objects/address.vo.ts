import { DomainValidationError } from '@domain/errors/domain.errors';

export class Address {
  constructor(
    public readonly street: string,
    public readonly city: string,
    public readonly country: string,
    public readonly zipCode: string,
  ) {
    if (!street || !city || !country) throw new DomainValidationError('Invalid address details.');
  }
}
