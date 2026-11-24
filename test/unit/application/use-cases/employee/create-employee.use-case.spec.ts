import { CreateEmployeeUseCase } from '@application/use-cases/create-employee.use-case';
import { Employee } from '@domain/entities/employee.entity';
import { EMPLOYEE_REPOSITORY } from '@domain/tokens/employee.repository.token';
import { Test, TestingModule } from '@nestjs/testing';
import { CreateEmployeeDto } from '@shared/dtos/employee/create-employee.dto';

describe('CreateEmployeeUseCase', () => {
  let service: CreateEmployeeUseCase;

  const mockEmployeeRepository = {
    findById: jest.fn(),
    save: jest.fn(),
    find: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CreateEmployeeUseCase,
        {
          provide: EMPLOYEE_REPOSITORY,
          useValue: mockEmployeeRepository,
        },
      ],
    }).compile();

    service = module.get<CreateEmployeeUseCase>(CreateEmployeeUseCase);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('execute', () => {
    it('should create an employee, save it, and return its generated id', async () => {
      const dto: CreateEmployeeDto = {
        name: 'Example Employee',
        email: 'employee@example.com',
        birthDate: `${new Date().getFullYear() - 30}-01-01`,
        contractDate: '2020-01-01',
        profession: 'Engineer',
        address: {
          street: 'Main Street',
          city: 'Example City',
          country: 'Example Country',
          zipCode: '12345',
        },
      };
      let savedEmployee: Employee | undefined;
      mockEmployeeRepository.save.mockImplementation((employee: Employee) => {
        savedEmployee = employee;
        return Promise.resolve();
      });

      const result = await service.execute(dto);

      expect(mockEmployeeRepository.save).toHaveBeenCalledTimes(1);
      expect(savedEmployee).toBeDefined();
      if (!savedEmployee) {
        throw new Error('Expected the repository to receive the new employee.');
      }
      expect(savedEmployee.getName()).toBe(dto.name);
      expect(savedEmployee.getEmail()).toBe(dto.email);
      expect(savedEmployee.getBirthDate().value).toBe(dto.birthDate);
      expect(savedEmployee.getContractDate().value).toBe(dto.contractDate);
      expect(result).toBe(savedEmployee.getId());
    });
  });
});
