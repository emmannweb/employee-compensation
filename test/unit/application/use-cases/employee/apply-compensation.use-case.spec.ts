import { ApplyCompensationUseCase } from '@application/use-cases/apply-compensation.use-case';
import { Employee } from '@domain/entities/employee.entity';
import { CompensationType } from '@domain/enums/compensation-type.enum';
import { EMPLOYEE_REPOSITORY } from '@domain/tokens/employee.repository.token';
import { Address } from '@domain/value-objects/address.vo';
import { BirthDate } from '@domain/value-objects/birth-date.vo';
import { ContractDate } from '@domain/value-objects/contract-date.vo';
import { Money } from '@domain/value-objects/money.vo';
import { NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';

describe('ApplyCompensationUseCase', () => {
  let service: ApplyCompensationUseCase;

  const mockEmployeeRepository = {
    findById: jest.fn(),
    save: jest.fn(),
    find: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ApplyCompensationUseCase,
        {
          provide: EMPLOYEE_REPOSITORY,
          useValue: mockEmployeeRepository,
        },
      ],
    }).compile();

    service = module.get<ApplyCompensationUseCase>(ApplyCompensationUseCase);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('execute', () => {
    it('should update the employee compensation and save the employee', async () => {
      const employee = Employee.create(
        'Example Employee',
        'employee@example.com',
        new BirthDate(`${new Date().getFullYear() - 30}-01-01`),
        new ContractDate('2020-01-01'),
        'Engineer',
        new Address('Main Street', 'Example City', 'Example Country', '12345'),
      );
      mockEmployeeRepository.findById.mockResolvedValue(employee);
      mockEmployeeRepository.save.mockResolvedValue(undefined);

      const result = await service.execute(employee.getId(), CompensationType.BASE_SALARY, 75000, 'USD');

      expect(result).toBe(employee.getId());
      expect(mockEmployeeRepository.findById).toHaveBeenCalledWith(employee.getId());
      expect(mockEmployeeRepository.save).toHaveBeenCalledWith(employee);
      expect(employee.getCompensations()).toHaveLength(1);
      expect(employee.getCompensations()[0].getType()).toBe(CompensationType.BASE_SALARY);
      expect(employee.getCompensations()[0].getAmount()).toEqual(new Money(75000, 'USD'));
    });

    it('should throw not found when the employee does not exist', async () => {
      mockEmployeeRepository.findById.mockResolvedValue(null);

      await expect(service.execute('missing-id', CompensationType.BASE_SALARY, 75000, 'USD')).rejects.toBeInstanceOf(NotFoundException);
      expect(mockEmployeeRepository.save).not.toHaveBeenCalled();
    });
  });
});
