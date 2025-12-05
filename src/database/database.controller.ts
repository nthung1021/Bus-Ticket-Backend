import { Controller, Get, OnModuleInit } from '@nestjs/common';
import { DatabaseService } from './database.service';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';

@ApiTags('Database')
@Controller('database')
export class DatabaseController implements OnModuleInit {
  constructor(private readonly databaseService: DatabaseService) {}

  onModuleInit() {
    console.log('🔗 Database monitoring endpoints initialized');
  }

  @Get('health')
  @ApiOperation({ summary: 'Check database connection pool health' })
  @ApiResponse({ status: 200, description: 'Database health information' })
  async getHealth() {
    const health = await this.databaseService.checkHealth();
    
    return {
      success: true,
      data: health,
      message: health.status === 'healthy' ? 'Database is healthy' : 
                health.status === 'warning' ? 'Database pool under stress' : 
                'Database pool critical',
    };
  }

  @Get('pool/stats')
  @ApiOperation({ summary: 'Get detailed connection pool statistics' })
  @ApiResponse({ status: 200, description: 'Connection pool statistics' })
  getPoolStats() {
    const stats = this.databaseService.getPoolStats();
    
    return {
      success: true,
      data: stats,
      message: 'Connection pool statistics retrieved successfully',
    };
  }

  @Get('pool/config')
  @ApiOperation({ summary: 'Get connection pool configuration' })
  @ApiResponse({ status: 200, description: 'Connection pool configuration' })
  getPoolConfig() {
    const config = this.databaseService.getPoolConfig();
    
    return {
      success: true,
      data: config,
      message: 'Connection pool configuration retrieved successfully',
    };
  }

  @Get('performance')
  @ApiOperation({ summary: 'Test database query performance' })
  @ApiResponse({ status: 200, description: 'Database performance metrics' })
  async testPerformance() {
    const performance = await this.databaseService.testQueryPerformance();
    
    return {
      success: true,
      data: {
        ...performance,
        status: performance.queryTime < 10 ? 'excellent' : 
                performance.queryTime < 50 ? 'good' : 
                performance.queryTime < 100 ? 'fair' : 'poor',
      },
      message: 'Database performance test completed',
    };
  }
}
