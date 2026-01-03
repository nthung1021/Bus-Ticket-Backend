import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Seat } from '../entities/seat.entity';
import { CreateSeatDto } from './dto/create-seat.dto';
import { UpdateSeatDto } from './dto/update-seat.dto';

@Injectable()
export class SeatService {
	constructor(
		@InjectRepository(Seat)
		private readonly seatRepo: Repository<Seat>,
	) {}

	async create(dto: CreateSeatDto): Promise<Seat> {
		const seat = this.seatRepo.create({
			busId: dto.busId,
			seatCode: dto.seatCode,
			seatType: dto.seatType,
			isActive: dto.isActive ?? true,
		});
		return await this.seatRepo.save(seat);
	}

	async findAll(): Promise<Seat[]> {
		return await this.seatRepo.find();
	}

	async findByBus(busId: string): Promise<Seat[]> {
		return await this.seatRepo.find({ where: { busId } });
	}

	async findOne(id: string): Promise<Seat> {
		const seat = await this.seatRepo.findOne({ where: { id } });
		if (!seat) throw new NotFoundException(`Seat ${id} not found`);
		return seat;
	}

	async update(id: string, dto: UpdateSeatDto): Promise<Seat> {
		const seat = await this.findOne(id);
		Object.assign(seat, dto);
		return await this.seatRepo.save(seat);
	}

	async remove(id: string): Promise<void> {
		const seat = await this.findOne(id);
		await this.seatRepo.remove(seat);
	}
}
