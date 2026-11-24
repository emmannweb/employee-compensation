import { CreateEmployeeDto } from '@shared/dtos/employee/create-employee.dto';
import { Controller, Post, Body, Param, HttpCode, HttpStatus, Get, Query, ParseUUIDPipe } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiParam, ApiQuery, ApiTags } from '@nestjs/swagger';
import { EmployeeQueryDto } from '@shared/dtos/employee/employee-query.dto';
import { PaginatedResponseDto } from '@shared/pagination/paginated-response.dto';
import { FindEmployeesUseCase } from '@application/use-cases/find-employees.use-case';
import { FindEmployeeByIdUseCase } from '@application/use-cases/find-employee-by-id.use-case';
import { EmployeeDetailsDto } from '@shared/dtos/employee/employee-details.dto';
import { CreateEmployeeUseCase } from '@application/use-cases/create-employee.use-case';
import { ApplyCompensationUseCase } from '@application/use-cases/apply-compensation.use-case';
import { ApplyCompDto } from '@shared/dtos/compensation/apply-compensation';
import { ApiPaginatedResponse } from '@infrastructure/decorators/paginated-response.decorator';
import { GetEmployeeDto } from '@shared/dtos/employee/get-employee.dto';

@ApiTags('employees')
@Controller('employees')
export class EmployeeController {
  constructor(
    private readonly createEmployeeUseCase: CreateEmployeeUseCase,
    private readonly applyCompensationUseCase: ApplyCompensationUseCase,
    private readonly findEmployeesUseCase: FindEmployeesUseCase,
    private readonly findEmployeeByIdUseCase: FindEmployeeByIdUseCase,
  ) {}

  @Get()
  @ApiOperation({ summary: 'Get a paginated list of employees' })
  @ApiQuery({ name: 'pageNumber', required: false, type: Number, minimum: 1, example: 1 })
  @ApiQuery({ name: 'pageSize', required: false, type: Number, minimum: 1, maximum: 100, example: 10 })
  @ApiPaginatedResponse(GetEmployeeDto)
  async find(@Query() query: EmployeeQueryDto): Promise<PaginatedResponseDto<GetEmployeeDto>> {
    return this.findEmployeesUseCase.execute(query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get an employee and their compensations' })
  @ApiParam({ name: 'id', format: 'uuid' })
  @ApiOkResponse({ type: EmployeeDetailsDto })
  async findById(@Param('id', new ParseUUIDPipe({ version: '4' })) id: string): Promise<EmployeeDetailsDto> {
    return this.findEmployeeByIdUseCase.execute(id);
  }

  @Post()
  async create(@Body() dto: CreateEmployeeDto): Promise<string> {
    return await this.createEmployeeUseCase.execute(dto);
  }

  @Post(':id/compensations')
  @HttpCode(HttpStatus.OK)
  async applyComp(@Param('id') id: string, @Body() dto: ApplyCompDto): Promise<string> {
    return await this.applyCompensationUseCase.execute(id, dto.type, dto.amount, dto.currency);
  }
}
