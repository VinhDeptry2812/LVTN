import { IsNotEmpty, IsString, IsArray, IsOptional, IsIn } from 'class-validator';

export class RequestReturnDto {
  @IsNotEmpty()
  @IsString()
  reason: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  images?: string[];

  @IsNotEmpty()
  @IsArray()
  items: any[];

  @IsNotEmpty()
  @IsString()
  @IsIn(['refund', 'exchange'])
  action_type: 'refund' | 'exchange';
}
