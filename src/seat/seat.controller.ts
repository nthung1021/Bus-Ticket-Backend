import { Controller, Get, Post, Put, Delete, Param, Body, HttpCode, HttpStatus, ParseUUIDPipe } from '@nestjs/common';
import { SeatService } from './seat.service';
import { CreateSeatDto } from './dto/create-seat.dto';
import { UpdateSeatDto } from './dto/update-seat.dto';

@Controller('seats')
export class SeatController {
	constructor(private readonly seatService: SeatService) {}

	@Post()
	async create(@Body() dto: CreateSeatDto) {
		return this.seatService.create(dto);
	}

	@Get()
	async findAll() {
		return this.seatService.findAll();
	}

	@Get('bus/:busId')
	async findByBus(@Param('busId', new ParseUUIDPipe()) busId: string) {
		return this.seatService.findByBus(busId);
	}

	@Get(':id')
	async findOne(@Param('id', new ParseUUIDPipe()) id: string) {
		return this.seatService.findOne(id);
	}

	@Put(':id')
	async update(@Param('id', new ParseUUIDPipe()) id: string, @Body() dto: UpdateSeatDto) {
		return this.seatService.update(id, dto);
	}

	@Delete(':id')
	@HttpCode(HttpStatus.NO_CONTENT)
	async remove(@Param('id', new ParseUUIDPipe()) id: string) {
		await this.seatService.remove(id);
	}
}
