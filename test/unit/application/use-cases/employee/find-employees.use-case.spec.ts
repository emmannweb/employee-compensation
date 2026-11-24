import { FindEmployeesUseCase } from '@application/use-cases/find-employees.use-case';
import { Employee } from '@domain/entities/employee.entity';
import { EMPLOYEE_REPOSITORY } from '@domain/tokens/employee.repository.token';
import { Address } from '@domain/value-objects/address.vo';
import { BirthDate } from '@domain/value-objects/birth-date.vo';
import { ContractDate } from '@domain/value-objects/contract-date.vo';
import { Test, TestingModule } from '@nestjs/testing';
import { EmployeeQueryDto } from '@shared/dtos/employee/employee-query.dto';
import { PaginatedResponseDto } from '@shared/pagination/paginated-response.dto';

describe('FindEmployeesUseCase', () => {
  let service: FindEmployeesUseCase;

  const mockEmployeeRepository = {
    findById: jest.fn(),
    save: jest.fn(),
    find: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        FindEmployeesUseCase,
        {
          provide: EMPLOYEE_REPOSITORY,
          useValue: mockEmployeeRepository,
        },
      ],
    }).compile();

    service = module.get<FindEmployeesUseCase>(FindEmployeesUseCase);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('execute', () => {
    it('should return mapped employees and pagination metadata using default pagination', async () => {
      const employee = Employee.create(
        'Example Employee',
        'employee@example.com',
        new BirthDate(`${new Date().getFullYear() - 30}-01-01`),
        new ContractDate('2020-01-01'),
        'Engineer',
        new Address('Main Street', 'Example City', 'Example Country', '12345'),
      );
      const pagination = {
        pageNumber: 1,
        pageSize: 10,
        totalPages: 1,
        totalRecords: 1,
      };
      const page: PaginatedResponseDto<Employee> = { items: [employee], ...pagination };
      mockEmployeeRepository.find.mockResolvedValue(page);

      const result = await service.execute(new EmployeeQueryDto());

      expect(result).toEqual({
        items: [
          {
            id: employee.getId(),
            name: 'Example Employee',
            email: 'employee@example.com',
            birthDate: employee.getBirthDate().value,
            contractDate: employee.getContractDate().value,
            profession: 'Engineer',
            address: {
              street: 'Main Street',
              city: 'Example City',
              country: 'Example Country',
              zipCode: '12345',
            },
          },
        ],
        ...pagination,
      });
      expect(mockEmployeeRepository.find).toHaveBeenCalledWith({ pageNumber: 1, pageSize: 10 });
    });

    it('should pass the requested pagination to the repository', async () => {
      const request = { pageNumber: 2, pageSize: 5 };
      mockEmployeeRepository.find.mockResolvedValue({
        items: [],
        pageNumber: 2,
        pageSize: 5,
        totalPages: 0,
        totalRecords: 0,
      });

      await service.execute(request);

      expect(mockEmployeeRepository.find).toHaveBeenCalledWith(request);
    });
  });
});
