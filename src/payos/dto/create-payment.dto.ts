import { IsNumber, IsString, IsOptional, IsArray } from 'class-validator';
import { Type } from 'class-transformer';

export class CreatePaymentDto {
  @IsNumber()
  @Type(() => Number)
  amount: number;

  @IsString()
  description: string;

  @IsString()
  @IsOptional()
  returnUrl?: string;

  @IsString()
  @IsOptional()
  cancelUrl?: string;

  @IsString()
  @IsOptional()
  signature?: string;

  @IsString()
  @IsOptional()
  orderCode?: string;

  @IsArray()
  @IsOptional()
  items?: Array<{
    name: string;
    quantity: number;
    price: number;
  }>;
}
