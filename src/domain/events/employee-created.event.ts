export class EmployeeCreatedEvent {
  constructor(
    public readonly employeeId: string,
    public readonly email: string,
  ) {}
}
