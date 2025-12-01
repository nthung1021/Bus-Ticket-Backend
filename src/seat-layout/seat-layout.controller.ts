import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { SeatLayoutService } from './seat-layout.service';
import { CreateSeatLayoutDto, UpdateSeatLayoutDto, CreateSeatFromTemplateDto } from './dto/create-seat-layout.dto';
import type { TemplatesResponse } from './dto/create-seat-layout.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles/roles.guard';
import { Roles } from '../auth/roles/roles.decorator';
import { SeatLayoutType, SeatLayout } from '../entities/seat-layout.entity';

@Controller('seat-layouts')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('admin')
export class SeatLayoutController {
  constructor(private readonly seatLayoutService: SeatLayoutService) {}

  @Post()
  create(@Body() createSeatLayoutDto: CreateSeatLayoutDto): Promise<SeatLayout> {
    return this.seatLayoutService.create(createSeatLayoutDto);
  }

  @Post('from-template')
  createFromTemplate(@Body() createFromTemplateDto: CreateSeatFromTemplateDto): Promise<SeatLayout> {
    return this.seatLayoutService.createFromTemplate(createFromTemplateDto);
  }

  @Get()
  findAll(): Promise<SeatLayout[]> {
    return this.seatLayoutService.findAll();
  }

  @Get('templates')
  getTemplates(): TemplatesResponse {
    return {
      templates: [
        {
          type: SeatLayoutType.STANDARD_2X2,
          name: 'Standard 2x2',
          description: 'Standard bus layout with 2 seats per row',
          totalSeats: 24,
          preview: 'A1 B1 | A2 B2 | A3 B3 ...',
        },
        {
          type: SeatLayoutType.STANDARD_2X3,
          name: 'Standard 2x3',
          description: 'Standard bus layout with 3 seats per row',
          totalSeats: 30,
          preview: 'A1 B1 C1 | A2 B2 C2 | A3 B3 C3 ...',
        },
        {
          type: SeatLayoutType.VIP_1X2,
          name: 'VIP 1x2',
          description: 'VIP layout with wider seats',
          totalSeats: 16,
          preview: 'A1 B1 | A2 B2 | A3 B3 ...',
        },
        {
          type: SeatLayoutType.SLEEPER_1X2,
          name: 'Sleeper 1x2',
          description: 'Sleeper layout with extended seats',
          totalSeats: 12,
          preview: 'A1 B1 | A2 B2 | A3 B3 ...',
        },
      ],
    };
  }

  @Get(':id')
  findOne(@Param('id') id: string): Promise<SeatLayout> {
    return this.seatLayoutService.findOne(id);
  }

  @Get('bus/:busId')
  findByBusId(@Param('busId') busId: string): Promise<SeatLayout> {
    return this.seatLayoutService.findByBusId(busId);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateSeatLayoutDto: UpdateSeatLayoutDto): Promise<SeatLayout> {
    return this.seatLayoutService.update(id, updateSeatLayoutDto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  remove(@Param('id') id: string): Promise<void> {
    return this.seatLayoutService.remove(id);
  }

}
