// src/auth/jwt.strategy.spec.ts
import { Test, TestingModule } from '@nestjs/testing';
import { JwtStrategy } from './jwt.strategy';
import { createRedisMock } from '../../../test/utils/redis.mock';
import { UnauthorizedException } from '@nestjs/common';

type Payload = {
  sub: string;
  email?: string;
  role?: string;
  [k: string]: unknown;
};

describe('JwtStrategy', () => {
  let strategy: JwtStrategy;
  const redisMock = createRedisMock();

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        JwtStrategy,
        // Adjust the token name if your project uses a different injection token for Redis
        { provide: 'REDIS_CLIENT', useValue: redisMock },
      ],
    }).compile();

    strategy = module.get<JwtStrategy>(JwtStrategy);
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  it('validate returns payload when token not blacklisted', async () => {
    // Arrange - ensure redis.get resolves to null (not blacklisted)
    (redisMock.get as unknown as jest.Mock).mockResolvedValueOnce(null);

    const payload: Payload = { sub: '123', email: 'a@x.com', role: 'ADMIN' };

    // Act
    const validated = await strategy.validate(payload);

    // Assert
    expect(validated).toBeDefined();
    expect(validated.email).toBe('a@x.com');
    expect(validated.role).toBe('ADMIN');
  });

  it('validate throws if token blacklisted', async () => {
    // Arrange - simulate blacklisted token
    (redisMock.get as unknown as jest.Mock).mockResolvedValueOnce('1');

    const payload: Payload = { sub: '1' };

    // Act & Assert
    await expect(strategy.validate(payload)).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
  });
});
