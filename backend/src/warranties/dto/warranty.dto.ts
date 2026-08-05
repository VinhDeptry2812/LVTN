import { IsNotEmpty, IsOptional, IsString, IsArray, IsEnum, IsInt } from 'class-validator';
import { WarrantyStatus, ClaimStatus } from '../warranty.entity';

export class ClaimWarrantyDto {
  @IsNotEmpty({ message: 'Vui lòng nhập lý do yêu cầu bảo hành' })
  @IsString()
  claim_reason: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  claim_images?: string[];
}

export class ProcessWarrantyDto {
  @IsOptional()
  @IsEnum(WarrantyStatus, { message: 'Trạng thái phiếu bảo hành không hợp lệ' })
  status?: WarrantyStatus;

  @IsOptional()
  @IsEnum(ClaimStatus, { message: 'Trạng thái xử lý không hợp lệ' })
  claim_status?: ClaimStatus;

  @IsOptional()
  @IsString()
  resolution_note?: string;

  @IsOptional()
  @IsString()
  resolution_type?: string;

  @IsOptional()
  @IsString()
  assigned_technician?: string;

  @IsOptional()
  @IsString()
  serial_number?: string;

  @IsOptional()
  @IsString()
  appointment_date?: string;
}
