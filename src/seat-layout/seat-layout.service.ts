import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SeatLayout, SeatLayoutType, SeatInfo, SeatPosition, SeatLayoutConfig, SeatPricingConfig } from '../entities/seat-layout.entity';
import { Bus } from '../entities/bus.entity';
import { CreateSeatLayoutDto, UpdateSeatLayoutDto, CreateSeatFromTemplateDto } from './dto/create-seat-layout.dto';

@Injectable()
export class SeatLayoutService {
  constructor(
    @InjectRepository(SeatLayout)
    private readonly seatLayoutRepository: Repository<SeatLayout>,
    @InjectRepository(Bus)
    private readonly busRepository: Repository<Bus>,
  ) {}

  async create(createSeatLayoutDto: CreateSeatLayoutDto): Promise<SeatLayout> {
    // Verify bus exists
    const bus = await this.busRepository.findOne({
      where: { id: createSeatLayoutDto.busId },
    });

    if (!bus) {
      throw new NotFoundException(`Bus with ID ${createSeatLayoutDto.busId} not found`);
    }

    // Check if seat layout already exists for this bus
    const existingLayout = await this.seatLayoutRepository.findOne({
      where: { busId: createSeatLayoutDto.busId },
    });

    if (existingLayout) {
      throw new BadRequestException(`Seat layout already exists for bus ${createSeatLayoutDto.busId}`);
    }

    // Validate layout configuration
    this.validateLayoutConfig(createSeatLayoutDto);

    const seatLayout = this.seatLayoutRepository.create({
      busId: createSeatLayoutDto.busId,
      layoutType: createSeatLayoutDto.layoutType,
      totalRows: createSeatLayoutDto.totalRows,
      seatsPerRow: createSeatLayoutDto.seatsPerRow,
      layoutConfig: createSeatLayoutDto.layoutConfig as any, // Type casting for complex nested objects
      seatPricing: createSeatLayoutDto.seatPricing as any,
    });
    return await this.seatLayoutRepository.save(seatLayout);
  }

  async createFromTemplate(createFromTemplateDto: CreateSeatFromTemplateDto): Promise<SeatLayout> {
    const bus = await this.busRepository.findOne({
      where: { id: createFromTemplateDto.busId },
    });

    if (!bus) {
      throw new NotFoundException(`Bus with ID ${createFromTemplateDto.busId} not found`);
    }

    const existingLayout = await this.seatLayoutRepository.findOne({
      where: { busId: createFromTemplateDto.busId },
    });

    if (existingLayout) {
      throw new BadRequestException(`Seat layout already exists for bus ${createFromTemplateDto.busId}`);
    }

    const templateConfig = this.getTemplateConfig(createFromTemplateDto.layoutType);
    
    const seatLayout = this.seatLayoutRepository.create({
      busId: createFromTemplateDto.busId,
      layoutType: createFromTemplateDto.layoutType,
      totalRows: templateConfig.totalRows,
      seatsPerRow: templateConfig.seatsPerRow,
      layoutConfig: templateConfig.layoutConfig,
      seatPricing: createFromTemplateDto.seatPricing,
    });

    return await this.seatLayoutRepository.save(seatLayout);
  }

  async findAll(): Promise<SeatLayout[]> {
    return await this.seatLayoutRepository.find({
      relations: ['bus'],
    });
  }

  async findOne(id: string): Promise<SeatLayout> {
    const seatLayout = await this.seatLayoutRepository.findOne({
      where: { id },
      relations: ['bus'],
    });

    if (!seatLayout) {
      throw new NotFoundException(`Seat layout with ID ${id} not found`);
    }

    return seatLayout;
  }

  async findByBusId(busId: string): Promise<SeatLayout> {
    const seatLayout = await this.seatLayoutRepository.findOne({
      where: { busId },
      relations: ['bus'],
    });

    if (!seatLayout) {
      throw new NotFoundException(`Seat layout for bus ${busId} not found`);
    }

    return seatLayout;
  }

  async update(id: string, updateSeatLayoutDto: UpdateSeatLayoutDto): Promise<SeatLayout> {
    const seatLayout = await this.findOne(id);

    if (updateSeatLayoutDto.layoutConfig) {
      // Create a temporary object with the updated config for validation
      const tempConfig = { ...seatLayout, ...updateSeatLayoutDto };
      this.validateLayoutConfig(tempConfig as any);
    }

    Object.assign(seatLayout, updateSeatLayoutDto);
    return await this.seatLayoutRepository.save(seatLayout);
  }

  async remove(id: string): Promise<void> {
    const result = await this.seatLayoutRepository.delete(id);
    if (result.affected === 0) {
      throw new NotFoundException(`Seat layout with ID ${id} not found`);
    }
  }

  private validateLayoutConfig(layoutConfig: any): void {
    const { totalRows, seatsPerRow, layoutConfig: config } = layoutConfig;
    
    if (!config || !config.seats || !config.dimensions) {
      throw new BadRequestException('Invalid layout configuration');
    }

    // Validate seat count matches configuration
    const expectedSeatCount = totalRows * seatsPerRow;
    const actualSeatCount = config.seats.length;

    if (actualSeatCount !== expectedSeatCount) {
      throw new BadRequestException(
        `Seat count mismatch: expected ${expectedSeatCount} seats, got ${actualSeatCount}`
      );
    }

    // Validate seat positions are within bounds
    for (const seat of config.seats) {
      if (seat.position.row > totalRows || seat.position.position > seatsPerRow) {
        throw new BadRequestException(`Invalid seat position: ${seat.code}`);
      }
    }
  }

  private getTemplateConfig(layoutType: SeatLayoutType): {
    totalRows: number;
    seatsPerRow: number;
    layoutConfig: SeatLayoutConfig;
  } {
    const templates = {
      [SeatLayoutType.STANDARD_2X2]: this.createStandard2x2Template(),
      [SeatLayoutType.STANDARD_2X3]: this.createStandard2x3Template(),
      [SeatLayoutType.VIP_1X2]: this.createVip1x2Template(),
      [SeatLayoutType.SLEEPER_1X2]: this.createSleeper1x2Template(),
    };

    return templates[layoutType] || templates[SeatLayoutType.STANDARD_2X2];
  }

  private createStandard2x2Template() {
    const rows = 12;
    const seatsPerRow = 2;
    const seatWidth = 40;
    const seatHeight = 40;
    const aisleWidth = 30;
    const rowSpacing = 10;

    const seats: SeatInfo[] = [];
    
    for (let row = 1; row <= rows; row++) {
      for (let pos = 1; pos <= seatsPerRow; pos++) {
        const seat: SeatInfo = {
          id: `seat-${row}-${pos}`,
          code: `${row}${String.fromCharCode(64 + pos)}`,
          type: 'normal',
          position: {
            row,
            position: pos,
            x: (pos - 1) * (seatWidth + aisleWidth),
            y: (row - 1) * (seatHeight + rowSpacing),
            width: seatWidth,
            height: seatHeight,
          },
          isAvailable: true,
        };
        seats.push(seat);
      }
    }

    return {
      totalRows: rows,
      seatsPerRow,
      layoutConfig: {
        seats,
        aisles: [1], // Aisle after first seat
        dimensions: {
          totalWidth: seatsPerRow * seatWidth + aisleWidth,
          totalHeight: rows * (seatHeight + rowSpacing),
          seatWidth,
          seatHeight,
          aisleWidth,
          rowSpacing,
        },
      },
    };
  }

  private createStandard2x3Template() {
    const rows = 10;
    const seatsPerRow = 3;
    const seatWidth = 35;
    const seatHeight = 40;
    const aisleWidth = 25;
    const rowSpacing = 10;

    const seats: SeatInfo[] = [];
    
    for (let row = 1; row <= rows; row++) {
      for (let pos = 1; pos <= seatsPerRow; pos++) {
        const seat: SeatInfo = {
          id: `seat-${row}-${pos}`,
          code: `${row}${String.fromCharCode(64 + pos)}`,
          type: pos === 2 ? 'vip' : 'normal', // Middle seat is VIP
          position: {
            row,
            position: pos,
            x: pos > 1 ? (pos - 1) * seatWidth + aisleWidth : 0,
            y: (row - 1) * (seatHeight + rowSpacing),
            width: seatWidth,
            height: seatHeight,
          },
          isAvailable: true,
        };
        seats.push(seat);
      }
    }

    return {
      totalRows: rows,
      seatsPerRow,
      layoutConfig: {
        seats,
        aisles: [1, 2], // Aisles after first and second seats
        dimensions: {
          totalWidth: seatsPerRow * seatWidth + aisleWidth * 2,
          totalHeight: rows * (seatHeight + rowSpacing),
          seatWidth,
          seatHeight,
          aisleWidth,
          rowSpacing,
        },
      },
    };
  }

  private createVip1x2Template() {
    const rows = 8;
    const seatsPerRow = 2;
    const seatWidth = 50;
    const seatHeight = 50;
    const aisleWidth = 40;
    const rowSpacing = 15;

    const seats: SeatInfo[] = [];
    
    for (let row = 1; row <= rows; row++) {
      for (let pos = 1; pos <= seatsPerRow; pos++) {
        const seat: SeatInfo = {
          id: `seat-${row}-${pos}`,
          code: `${row}${String.fromCharCode(64 + pos)}`,
          type: 'vip',
          position: {
            row,
            position: pos,
            x: (pos - 1) * (seatWidth + aisleWidth),
            y: (row - 1) * (seatHeight + rowSpacing),
            width: seatWidth,
            height: seatHeight,
          },
          isAvailable: true,
        };
        seats.push(seat);
      }
    }

    return {
      totalRows: rows,
      seatsPerRow,
      layoutConfig: {
        seats,
        aisles: [1],
        dimensions: {
          totalWidth: seatsPerRow * seatWidth + aisleWidth,
          totalHeight: rows * (seatHeight + rowSpacing),
          seatWidth,
          seatHeight,
          aisleWidth,
          rowSpacing,
        },
      },
    };
  }

  private createSleeper1x2Template() {
    const rows = 6;
    const seatsPerRow = 2;
    const seatWidth = 60;
    const seatHeight = 80;
    const aisleWidth = 40;
    const rowSpacing = 20;

    const seats: SeatInfo[] = [];
    
    for (let row = 1; row <= rows; row++) {
      for (let pos = 1; pos <= seatsPerRow; pos++) {
        const seat: SeatInfo = {
          id: `seat-${row}-${pos}`,
          code: `${row}${String.fromCharCode(64 + pos)}`,
          type: 'business',
          position: {
            row,
            position: pos,
            x: (pos - 1) * (seatWidth + aisleWidth),
            y: (row - 1) * (seatHeight + rowSpacing),
            width: seatWidth,
            height: seatHeight,
          },
          isAvailable: true,
        };
        seats.push(seat);
      }
    }

    return {
      totalRows: rows,
      seatsPerRow,
      layoutConfig: {
        seats,
        aisles: [1],
        dimensions: {
          totalWidth: seatsPerRow * seatWidth + aisleWidth,
          totalHeight: rows * (seatHeight + rowSpacing),
          seatWidth,
          seatHeight,
          aisleWidth,
          rowSpacing,
        },
      },
    };
  }
}
