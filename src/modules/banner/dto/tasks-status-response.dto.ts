import { ApiProperty } from '@nestjs/swagger';

export class TaskInfoDto {
  @ApiProperty({
    description: 'Task name',
    example: 'activate-scheduled-banners',
  })
  name!: string;

  @ApiProperty({
    description: 'Task description',
    example: 'Auto-activate scheduled banners',
  })
  description!: string;

  @ApiProperty({
    description: 'Task schedule',
    example: 'Every hour',
  })
  schedule!: string;
}

export class TasksStatusResponseDto {
  @ApiProperty({
    description: 'Whether scheduled tasks are enabled',
    example: true,
  })
  tasksEnabled!: boolean;

  @ApiProperty({
    description: 'List of scheduled tasks',
    type: [TaskInfoDto],
  })
  tasks!: TaskInfoDto[];
}

