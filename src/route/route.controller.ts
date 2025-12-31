import { Controller, Get, Post, Body, Param, Put, Delete, Query } from '@nestjs/common';
import { RouteService } from './route.service';
import { Route } from '../entities/route.entity';
import { CreateRouteDto } from './dto/create-route.dto';
import { UpdateRouteDto } from './dto/update-route.dto';

@Controller('routes')
export class RouteController {
  constructor(private readonly routeService: RouteService) {}

  @Post()
  create(@Body() createRouteDto: CreateRouteDto): Promise<Route> {
    return this.routeService.create(createRouteDto);
  }

  @Get()
  findAll(): Promise<Route[]> {
    return this.routeService.findAll();
  }

  @Get('popular')
  async popular(@Query('limit') limit?: string) {
    const n = limit ? parseInt(limit, 10) : 8;
    return await this.routeService.getPopularRoutes(n);
  }

  @Get(':id')
  findOne(@Param('id') id: string): Promise<Route> {
    return this.routeService.findOne(id);
  }

  @Put(':id')
  update(@Param('id') id: string, @Body() updateRouteDto: UpdateRouteDto): Promise<Route> {
    return this.routeService.update(id, updateRouteDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string): Promise<void> {
    return this.routeService.remove(id);
  }
}
