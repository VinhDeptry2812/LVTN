import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
  Patch,
} from '@nestjs/common';
import { StockIssuesService } from './stock-issues.service';
import { CreateStockIssueDto } from './dto/create-stock-issue.dto';
import { UpdateStockIssueStatusDto } from './dto/update-stock-issue-status.dto';
import { StockIssueStatus, StockIssueReason } from './stock-issue.entity';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../users/user.entity';

@Controller('stock-issues')
@UseGuards(JwtAuthGuard, RolesGuard)
export class StockIssuesController {
  constructor(private readonly stockIssuesService: StockIssuesService) {}

  @Post()
  @Roles(UserRole.ADMIN, UserRole.STAFF)
  create(@Body() createDto: CreateStockIssueDto, @Request() req: any) {
    return this.stockIssuesService.create(createDto, req.user.id);
  }

  @Get()
  @Roles(UserRole.ADMIN, UserRole.STAFF)
  findAll(
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('status') status?: StockIssueStatus,
    @Query('reason') reason?: StockIssueReason,
    @Query('search') search?: string,
  ) {
    return this.stockIssuesService.findAll(
      page ? +page : 1,
      limit ? +limit : 10,
      status,
      reason,
      search,
    );
  }

  @Get(':id')
  @Roles(UserRole.ADMIN, UserRole.STAFF)
  findOne(@Param('id') id: string) {
    return this.stockIssuesService.findOne(+id);
  }

  @Patch(':id/status')
  @Roles(UserRole.ADMIN, UserRole.STAFF)
  updateStatus(
    @Param('id') id: string,
    @Body() updateStatusDto: UpdateStockIssueStatusDto,
    @Request() req: any,
  ) {
    return this.stockIssuesService.updateStatus(
      +id,
      updateStatusDto,
      req.user.id,
    );
  }
}
