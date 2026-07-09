// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mockedApiGet = vi.fn();
const mockedApiPost = vi.fn();
const mockedApiPatch = vi.fn();
const mockedApiDelete = vi.fn();

vi.mock('./api', () => ({
  extractListData: (data: unknown) => {
    if (Array.isArray(data)) return data;
    if (data && typeof data === 'object' && Array.isArray((data as { results?: unknown[] }).results)) {
      return (data as { results: unknown[] }).results;
    }
    return [];
  },
  default: {
    get: mockedApiGet,
    post: mockedApiPost,
    patch: mockedApiPatch,
    delete: mockedApiDelete,
  },
}));

import authService from './auth.service';
import teacherService from './teacher.service';

describe('auth and teacher API routes', () => {
  beforeEach(() => {
    localStorage.clear();
    mockedApiGet.mockReset();
    mockedApiPost.mockReset();
    mockedApiPatch.mockReset();
    mockedApiDelete.mockReset();
  });

  it('uses the v1 auth route for login', async () => {
    mockedApiPost.mockResolvedValue({ data: { access: 'token', refresh: 'refresh', user: {} } });

    await authService.login('teacher@example.com', 'password');

    expect(mockedApiPost).toHaveBeenCalledWith('/auth/login/', {
      email: 'teacher@example.com',
      password: 'password',
    });
  });

  it('uses the academic teacher endpoints for teacher CRUD', async () => {
    mockedApiGet.mockResolvedValue({ data: { id: 't1', full_name: 'Ada' } });
    mockedApiPost.mockResolvedValue({ data: { id: 't1', full_name: 'Ada' } });

    await teacherService.getMyProfile();
    await teacherService.create({ full_name: 'Ada' });

    expect(mockedApiGet).toHaveBeenCalledWith('/auth/my-teacher-profile/');
    expect(mockedApiPost).toHaveBeenCalledWith('/auth/academics/teachers/', { full_name: 'Ada' });
  });
});
