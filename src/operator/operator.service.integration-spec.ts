import { Test, TestingModule } from '@nestjs/testing';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { Repository } from 'typeorm';
import { getRepositoryToken } from '@nestjs/typeorm';
import { OperatorService } from './operator.service';
import { Operator, OperatorStatus } from '../entities/operator.entity';
import { Bus } from '../entities/bus.entity';
import { Route } from '../entities/route.entity';
import { testDatabaseConfig } from '../config/test-database.config';
import { ConflictException, NotFoundException } from '@nestjs/common';
import * as crypto from 'crypto';

// Mocking external environment variables
process.env.GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID || 'dummy-id';
process.env.GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET || 'dummy-secret';
process.env.GOOGLE_CALLBACK_URL = process.env.GOOGLE_CALLBACK_URL || 'http://localhost/callback';

describe('OperatorService (integration)', () => {
    let service: OperatorService;
    let moduleRef: TestingModule;
    let operatorRepository: Repository<Operator>;

    beforeAll(async () => {
        const module: TestingModule = await Test.createTestingModule({
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
                TypeOrmModule.forFeature([Operator, Bus, Route]),
            ],
            providers: [OperatorService],
        }).compile();

        moduleRef = module;
        service = module.get<OperatorService>(OperatorService);
        operatorRepository = module.get<Repository<Operator>>(getRepositoryToken(Operator));
    });

    afterAll(async () => {
        if (moduleRef) {
            await moduleRef.close();
        }
    });

    beforeEach(async () => {
        // Safe cleanup with raw query to bypass TypeORM checks
        const entities = ['routes', 'buses', 'operators'];
        for (const entity of entities) {
            try {
                await operatorRepository.query(`TRUNCATE TABLE "${entity}" RESTART IDENTITY CASCADE`);
            } catch (e) { }
        }
    });

    async function createOperator(email: string) {
        return await operatorRepository.save({
            name: 'Integration Operator',
            contactEmail: email,
            contactPhone: '0123456789',
            status: OperatorStatus.PENDING
        });
    }

    describe('create', () => {
        it('should create an operator', async () => {
            const dto = {
                name: 'New Operator',
                contactEmail: 'new@op.com',
                contactPhone: '0987654321',
                status: OperatorStatus.PENDING
            };

            const result = await service.create(dto);
            expect(result).toBeDefined();
            expect(result.id).toBeDefined();
            expect(result.contactEmail).toBe('new@op.com');
        });

        it('should throw ConflictException if email already exists', async () => {
            await createOperator('conflict@op.com');
            const dto = {
                name: 'Conflict Operator',
                contactEmail: 'conflict@op.com',
                contactPhone: '0987654321'
            };

            await expect(service.create(dto)).rejects.toThrow(ConflictException);
        });

        it('should set approvedAt if status is approved', async () => {
            const dto = {
                name: 'Approved Operator',
                contactEmail: 'approved@op.com',
                contactPhone: '0987654321',
                status: OperatorStatus.APPROVED
            };

            const result = await service.create(dto);
            expect(result.approvedAt).toBeDefined();
        });
    });

    describe('findAll', () => {
        it('should return all operators', async () => {
            await createOperator('op1@test.com');
            await createOperator('op2@test.com');

            const result = await service.findAll();
            expect(result.length).toBe(2);
        });
    });

    describe('findByStatus', () => {
        it('should return operators by status', async () => {
            await operatorRepository.save({
                name: 'Approve', email: 'a@a.com', contactEmail: 'a@a.com', contactPhone: '1', status: OperatorStatus.APPROVED
            });
            await operatorRepository.save({
                name: 'Pending', email: 'p@p.com', contactEmail: 'p@p.com', contactPhone: '2', status: OperatorStatus.PENDING
            });

            const approved = await service.findByStatus(OperatorStatus.APPROVED);
            expect(approved.length).toBe(1);
            expect(approved[0].status).toBe(OperatorStatus.APPROVED);
        });
    });

    describe('update', () => {
        it('should update operator details', async () => {
            const op = await createOperator('update@test.com');
            const result = await service.update(op.id, { name: 'Updated Name' });
            expect(result.name).toBe('Updated Name');
        });

        it('should throw ConflictException on duplicate email update', async () => {
            await createOperator('exist@test.com');
            const op = await createOperator('me@test.com');

            await expect(service.update(op.id, { contactEmail: 'exist@test.com' }))
                .rejects.toThrow(ConflictException);
        });

        it('should set approvedAt when status changes to APPROVED', async () => {
            const op = await createOperator('pending@test.com');
            const result = await service.update(op.id, { status: OperatorStatus.APPROVED });
            expect(result.status).toBe(OperatorStatus.APPROVED);
            expect(result.approvedAt).toBeDefined();
        });
    });

    describe('remove', () => {
        it('should remove operator', async () => {
            const op = await createOperator('del@test.com');
            await service.remove(op.id);
            
            const found = await operatorRepository.findOne({ where: { id: op.id } });
            expect(found).toBeNull();
        });

        it('should throw NotFoundException if id not found', async () => {
            await expect(service.remove(crypto.randomUUID())).rejects.toThrow(NotFoundException);
        });
    });
});
