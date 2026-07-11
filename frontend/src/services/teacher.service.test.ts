// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('./api', () => ({
  extractListData: (data: unknown) => {
    if (Array.isArray(data)) return data;
    if (data && typeof data === 'object' && Array.isArray((data as { results?: unknown[] }).results)) {
      return (data as { results: unknown[] }).results;
    }
    return [];
  },
  default: {
    get: vi.fn(),
    patch: vi.fn(),
    delete: vi.fn(),
  },
}));

import teacherService from './teacher.service';
import api from './api';

const mockedApiPatch = api.patch as unknown as ReturnType<typeof vi.fn>;
const mockedApiDelete = api.delete as unknown as ReturnType<typeof vi.fn>;

describe('teacherService.deleteTeacher', () => {
  beforeEach(() => {
    mockedApiPatch.mockReset();
    mockedApiDelete.mockReset();
  });

  it('soft-deactivates the teacher instead of issuing a hard delete', async () => {
    mockedApiPatch.mockResolvedValue({ data: { id: 't1', is_active: false } });

    await teacherService.deleteTeacher('t1');

    expect(mockedApiPatch).toHaveBeenCalledWith('/teachers/t1/', { is_active: false });
    expect(mockedApiDelete).not.toHaveBeenCalled();
  });
});
