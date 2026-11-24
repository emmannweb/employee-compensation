export class DomainValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = DomainValidationError.name;
  }
}

export class DomainConflictError extends Error {
  constructor(message: string) {
    super(message);
    this.name = DomainConflictError.name;
  }
}
