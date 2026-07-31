import { IsEnum } from 'class-validator';
import { StockIssueStatus } from '../stock-issue.entity';

export class UpdateStockIssueStatusDto {
  @IsEnum(StockIssueStatus)
  status: StockIssueStatus;
}
