import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Bus } from '../entities/bus.entity';
import { CreateBusDto } from './dto/create-bus.dto';
import { UpdateBusDto } from './dto/update-bus.dto';
import { CloudinaryService } from '../cloudinary/cloudinary.service';

@Injectable()
export class BusService {
  constructor(
    @InjectRepository(Bus)
    private readonly busRepository: Repository<Bus>,
    private readonly cloudinaryService: CloudinaryService,
  ) {}

  async uploadPhotos(id: string, files: Express.Multer.File[]): Promise<Bus> {
    if (!files || files.length === 0) {
      throw new BadRequestException('No files uploaded');
    }
    const bus = await this.findOne(id);
    
    const uploadPromises = files.map(file => this.cloudinaryService.uploadImage(file, 'Bus-Ticket/Bus-Photos'));
    const uploadResults = await Promise.all(uploadPromises);
    
    const photoUrls = uploadResults.map(result => result.secure_url);
    
    bus.photo = photoUrls;
    return await this.busRepository.save(bus);
  }

  async create(createBusDto: CreateBusDto): Promise<Bus> {
    const bus = this.busRepository.create(createBusDto);
    return await this.busRepository.save(bus);
  }

  async findAll(): Promise<Bus[]> {
    return await this.busRepository.find({
      relations: ['operator', 'trips', 'seats'],
    });
  }

  async findOne(id: string): Promise<Bus> {
    const bus = await this.busRepository.findOne({
      where: { id },
      relations: ['operator', 'trips', 'seats'],
    });

    if (!bus) {
      throw new NotFoundException(`Bus with ID ${id} not found`);
    }

    return bus;
  }

  async update(id: string, updateBusDto: UpdateBusDto): Promise<Bus> {
    const bus = await this.findOne(id);
    Object.assign(bus, updateBusDto);
    return await this.busRepository.save(bus);
  }

  async remove(id: string): Promise<void> {
    const result = await this.busRepository.delete(id);
    if (result.affected === 0) {
      throw new NotFoundException(`Bus with ID ${id} not found`);
    }
  }
}
