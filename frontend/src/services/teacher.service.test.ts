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

  it('asks the server to delete; the server keeps the record (deactivated) when the teacher has history', async () => {
    mockedApiDelete.mockResolvedValue({ status: 204 });

    await teacherService.deleteTeacher('t1');

    expect(mockedApiDelete).toHaveBeenCalledWith('/teachers/t1/', { skipGlobalToast: true });
    expect(mockedApiPatch).not.toHaveBeenCalled();
  });
});
