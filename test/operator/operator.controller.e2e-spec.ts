import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { Repository } from 'typeorm';
import { getRepositoryToken } from '@nestjs/typeorm';
import { OperatorModule } from '../../src/operator/operator.module';
import { Operator, OperatorStatus } from '../../src/entities/operator.entity';
import { Bus } from '../../src/entities/bus.entity';
import { Route } from '../../src/entities/route.entity';
import { User } from '../../src/entities/user.entity'; 
import { testDatabaseConfig } from '../../src/config/test-database.config';

process.env.GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
process.env.GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;
process.env.GOOGLE_CALLBACK_URL = process.env.GOOGLE_CALLBACK_URL;

describe('OperatorController (e2e)', () => {
  let app: INestApplication;
  let operatorRepository: Repository<Operator>;
  let userRepository: Repository<User>; // Just for global cleanup if needed

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          isGlobal: true,
          envFilePath: '.env.test',
        }),
        TypeOrmModule.forRootAsync({
          imports: [ConfigModule],
          useFactory: (configService: ConfigService) =>
            testDatabaseConfig(configService),
          inject: [ConfigService],
        }),
        OperatorModule,
        // Import other entities to enable repository injection for cleanup
        TypeOrmModule.forFeature([User, Bus, Route]),
      ],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ transform: true }));
    await app.init();

    operatorRepository = moduleFixture.get<Repository<Operator>>(getRepositoryToken(Operator));
    userRepository = moduleFixture.get<Repository<User>>(getRepositoryToken(User));

    // Initial Cleanup
    const entities = ['routes', 'buses', 'operators', 'users'];
    for (const entity of entities) {
        try {
            await operatorRepository.query(`TRUNCATE TABLE "${entity}" RESTART IDENTITY CASCADE`);
        } catch (e) {}
    }
  });

  afterAll(async () => {
    if (operatorRepository) {
        const entities = ['routes', 'buses', 'operators', 'users'];
        for (const entity of entities) {
            try {
                await operatorRepository.query(`TRUNCATE TABLE "${entity}" RESTART IDENTITY CASCADE`);
            } catch (e) {}
        }
    }
    if (app) {
      await app.close();
    }
  });

  beforeEach(async () => {
      // Per-test cleanup
      const entities = ['routes', 'buses', 'operators'];
      for (const entity of entities) {
          try {
             await operatorRepository.query(`TRUNCATE TABLE "${entity}" RESTART IDENTITY CASCADE`);
          } catch(e) {}
      }
  });

  describe('POST /operators', () => {
    it('should create an operator', async () => {
      const dto = {
        name: 'E2E Operator',
        contactEmail: 'e2e@op.com',
        contactPhone: '111',
      };

      const response = await request(app.getHttpServer())
        .post('/operators')
        .send(dto)
        .expect(201);

      expect(response.body.id).toBeDefined();
      expect(response.body.name).toBe('E2E Operator');
    });
  });

  describe('GET /operators', () => {
    it('should return operators', async () => {
        await operatorRepository.save({
            name: 'Op1', contactEmail: '1@op.com', contactPhone: '1', status: OperatorStatus.APPROVED
        });

        const response = await request(app.getHttpServer())
            .get('/operators')
            .expect(200);
        
        expect(response.body.length).toBe(1);
    });
  });

  describe('GET /operators/:id', () => {
    it('should return one operator', async () => {
        const op = await operatorRepository.save({
            name: 'Op Single', contactEmail: 's@op.com', contactPhone: '1', status: OperatorStatus.APPROVED
        });

        const response = await request(app.getHttpServer())
            .get(`/operators/${op.id}`)
            .expect(200);

        expect(response.body.id).toBe(op.id);
    });
  });

  describe('PUT /operators/:id', () => {
    it('should return update operator', async () => {
        const op = await operatorRepository.save({
            name: 'Op Update', contactEmail: 'u@op.com', contactPhone: '1', status: OperatorStatus.APPROVED
        });

        const response = await request(app.getHttpServer())
            .put(`/operators/${op.id}`)
            .send({ name: 'Updated E2E' })
            .expect(200);

        expect(response.body.name).toBe('Updated E2E');
    });
  });

  describe('PUT /operators/:id/approve', () => {
    it('should approve operator', async () => {
        const op = await operatorRepository.save({
            name: 'Op Pending', contactEmail: 'pend@op.com', contactPhone: '1', status: OperatorStatus.PENDING
        });

        const response = await request(app.getHttpServer())
            .put(`/operators/${op.id}/approve`)
            .expect(200);

        expect(response.body.status).toBe(OperatorStatus.APPROVED);
        expect(response.body.approvedAt).toBeDefined();
    });
  });

  describe('PUT /operators/:id/suspend', () => {
    it('should suspend operator', async () => {
        const op = await operatorRepository.save({
            name: 'Op Active', contactEmail: 'act@op.com', contactPhone: '1', status: OperatorStatus.APPROVED
        });

        const response = await request(app.getHttpServer())
            .put(`/operators/${op.id}/suspend`)
            .expect(200);

        expect(response.body.status).toBe(OperatorStatus.SUSPENDED);
    });
  });

  describe('DELETE /operators/:id', () => {
    it('should delete operator', async () => {
        const op = await operatorRepository.save({
            name: 'Op Del', contactEmail: 'del@op.com', contactPhone: '1', status: OperatorStatus.APPROVED
        });

        await request(app.getHttpServer())
            .delete(`/operators/${op.id}`)
            .expect(204);

        const found = await operatorRepository.findOne({ where: { id: op.id } });
        expect(found).toBeNull();
    });
  });
});
