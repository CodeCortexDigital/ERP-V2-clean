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
  },
}));

import studentService from './student.service';
import api from './api';

const mockedApiGet = api.get as unknown as ReturnType<typeof vi.fn>;

describe('studentService.getAll', () => {
  beforeEach(() => {
    localStorage.clear();
    mockedApiGet.mockReset();
  });

  it('returns only backend students and ignores legacy localStorage custom_students', async () => {
    mockedApiGet.mockResolvedValue({ data: [] });
    localStorage.setItem('custom_students', JSON.stringify([
      {
        id: 'std-999',
        student_id: 'STU0001',
        full_name: 'Rubbia',
        class_name: 'Grade 1-A',
        is_active: true,
      },
    ]));

    const response = await studentService.getAll();

    expect(mockedApiGet).toHaveBeenCalledWith('/auth/students/');
    expect(response.data).toEqual([]);
  });
});
