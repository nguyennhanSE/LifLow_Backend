import { ConflictException, NotFoundException } from '@nestjs/common';

jest.mock('src/libs/logger/logger.service', () => ({ AppLogger: jest.fn() }), {
  virtual: true,
});
jest.mock('../repositories/chat.repository', () => ({ ChatRepository: jest.fn() }));

import { ChatService } from './chat.service';
import { RoomEntity } from '../entities/chat.entity';

describe('ChatService', () => {
  let service: ChatService;
  let repository: {
    getAllRooms: jest.Mock;
    getRoomById: jest.Mock;
    createRoom: jest.Mock;
    joinRoom: jest.Mock;
  };

  const logger = {
    debug: jest.fn(),
  };

  const createRoom = (overrides: Partial<RoomEntity> = {}): RoomEntity => ({
    id: 'room-id',
    user1Id: 'creator-id',
    user2Id: null,
    lastMessageAt: null,
    createdAt: new Date('2026-07-03T00:00:00.000Z'),
    updatedAt: new Date('2026-07-03T00:00:00.000Z'),
    user1: null,
    user2: null,
    messages: [],
    ...overrides,
  });

  beforeEach(() => {
    repository = {
      getAllRooms: jest.fn(),
      getRoomById: jest.fn(),
      createRoom: jest.fn(),
      joinRoom: jest.fn(),
    };

    service = new ChatService(logger as any, repository as any);
    jest.clearAllMocks();
  });

  it('creates a waiting room for the authenticated user', async () => {
    const room = createRoom();
    repository.createRoom.mockResolvedValue(room);

    await expect(service.createRoom('creator-id')).resolves.toEqual(room);

    expect(repository.createRoom).toHaveBeenCalledWith('creator-id');
  });

  it('throws NotFoundException when joining a missing room', async () => {
    repository.getRoomById.mockResolvedValue(null);

    await expect(service.joinRoom('room-id', 'joiner-id')).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it('keeps creator rejoin idempotent without filling user2Id', async () => {
    const room = createRoom();
    repository.getRoomById.mockResolvedValue(room);

    await expect(service.joinRoom('room-id', 'creator-id')).resolves.toEqual(room);

    expect(repository.joinRoom).not.toHaveBeenCalled();
  });

  it('sets user2Id when a second user joins an available room', async () => {
    const joinedRoom = createRoom({ user2Id: 'joiner-id' });
    repository.getRoomById.mockResolvedValue(createRoom());
    repository.joinRoom.mockResolvedValue(joinedRoom);

    await expect(service.joinRoom('room-id', 'joiner-id')).resolves.toEqual(joinedRoom);

    expect(repository.joinRoom).toHaveBeenCalledWith('room-id', 'joiner-id');
  });

  it('keeps existing participant rejoin idempotent', async () => {
    const room = createRoom({ user2Id: 'joiner-id' });
    repository.getRoomById.mockResolvedValue(room);

    await expect(service.joinRoom('room-id', 'joiner-id')).resolves.toEqual(room);

    expect(repository.joinRoom).not.toHaveBeenCalled();
  });

  it('rejects a third user joining a full room', async () => {
    repository.getRoomById.mockResolvedValue(createRoom({ user2Id: 'joiner-id' }));

    await expect(service.joinRoom('room-id', 'third-user-id')).rejects.toBeInstanceOf(
      ConflictException,
    );
  });
});
