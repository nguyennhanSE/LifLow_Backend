import { Point, User } from '@prisma/client';
import { PointResponseDto } from '../dto/point.dto';
import { PointEntity } from '../entities/point.entity';
import { toUserEntity } from '../../user/mapper/user.mapper';

type PointWithRelations = Point & { user?: User | null };

export function toPointEntity(point: Point): PointEntity {
  return {
    id: point.id,
    date: point.date,
    userId: point.userId,
    membershipLevel: point.membershipLevel,
    content: point.content,
    orderNumber: point.orderNumber,
    pointsType: point.pointsType,
    availablePointsIncrease: point.availablePointsIncrease,
    availablePointsDeduction: point.availablePointsDeduction,
    availablePointsBalance: point.availablePointsBalance,
    createdAt: point.createdAt,
    updatedAt: point.updatedAt,
  };
}

export function toPointResponseDto(point: PointEntity): PointResponseDto {
  return {
    ...point,
    userId: point.userId ?? null,
    date: point.date ?? null,
    membershipLevel: point.membershipLevel ?? null,
    content: point.content ?? null,
    orderNumber: point.orderNumber ?? null,
    pointsType: point.pointsType ?? null,
    availablePointsIncrease: point.availablePointsIncrease ?? null,
    availablePointsDeduction: point.availablePointsDeduction ?? null,
    availablePointsBalance: point.availablePointsBalance ?? null,
  } as PointResponseDto;
}

export function toPointEntityWithRelations(point: PointWithRelations): PointEntity {
  return {
    ...toPointEntity(point),
    user: point.user ? toUserEntity(point.user) : null,
    order: null, // Order relation not included in Prisma query
  };
}

