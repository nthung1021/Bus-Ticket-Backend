import { IsDateString } from 'class-validator';

export class ScheduleQueryDto {
  @IsDateString()
  startDate: string;

  @IsDateString()
  endDate: string;
}