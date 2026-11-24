import { FindEmployeeByIdUseCase } from '@application/use-cases/find-employee-by-id.use-case';
import { Employee } from '@domain/entities/employee.entity';
import { CompensationType } from '@domain/enums/compensation-type.enum';
import { EMPLOYEE_REPOSITORY } from '@domain/tokens/employee.repository.token';
import { Address } from '@domain/value-objects/address.vo';
import { BirthDate } from '@domain/value-objects/birth-date.vo';
import { ContractDate } from '@domain/value-objects/contract-date.vo';
import { Money } from '@domain/value-objects/money.vo';
import { NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';

describe('FindEmployeeByIdUseCase', () => {
  let service: FindEmployeeByIdUseCase;

  const mockEmployeeRepository = {
    findById: jest.fn(),
    find: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        FindEmployeeByIdUseCase,
        {
          provide: EMPLOYEE_REPOSITORY,
          useValue: mockEmployeeRepository,
        },
      ],
    }).compile();

    service = module.get<FindEmployeeByIdUseCase>(FindEmployeeByIdUseCase);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('execute', () => {
    it('should return employee details with all compensations', async () => {
      const employee = Employee.create(
        'Example Employee',
        'employee@example.com',
        new BirthDate(`${new Date().getFullYear() - 30}-01-01`),
        new ContractDate('2020-01-01'),
        'Engineer',
        new Address('Main Street', 'Example City', 'Example Country', '12345'),
      );
      employee.addOrUpdateCompensation(CompensationType.BASE_SALARY, new Money(75000), new Date('2026-01-01'));
      employee.addOrUpdateCompensation(CompensationType.BONUS, new Money(5000), new Date('2026-02-01'));
      mockEmployeeRepository.findById.mockResolvedValue(employee);

      const result = await service.execute(employee.getId());

      expect(mockEmployeeRepository.findById).toHaveBeenCalledWith(employee.getId());
      expect(result.id).toBe(employee.getId());
      expect(result.compensations).toHaveLength(2);
      expect(result.compensations).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            type: CompensationType.BASE_SALARY,
            amount: 75000,
            currency: 'USD',
          }),
          expect.objectContaining({
            type: CompensationType.BONUS,
            amount: 5000,
            currency: 'USD',
          }),
        ]),
      );
    });

    it('should throw not found when the employee does not exist', async () => {
      mockEmployeeRepository.findById.mockResolvedValue(null);

      await expect(service.execute('missing-id')).rejects.toBeInstanceOf(NotFoundException);
    });
  });
});
