import React from 'react';
import { render, RenderOptions } from '@testing-library/react';
import { vi } from 'vitest';

/**
 * Custom render function with common providers.
 * Add BrowserRouter, QueryClient, etc. as needed.
 */
export const customRender = (
  ui: React.ReactElement,
  options?: Omit<RenderOptions, 'wrapper'>,
) => {
  const Wrapper = ({ children }: { children: React.ReactNode }) => {
    return <>{children}</>;
  };

  return render(ui, { wrapper: Wrapper, ...options });
};

// Re-export everything from @testing-library/react
export * from '@testing-library/react';
export { customRender as render };

/**
 * Mock API responses for testing
 */
export const mockApiResponse = {
  login: {
    access: 'mock_access_token',
    refresh: 'mock_refresh_token',
    user: {
      id: 1,
      username: 'testuser',
      email: 'test@example.com',
      first_name: 'Test',
      last_name: 'User',
      role: 'student',
    },
  },
  students: [
    {
      id: 1,
      user: {
        id: 1,
        username: 'student1',
        first_name: 'Ahmed',
        last_name: 'Ali',
      },
      enrollment_number: 'STU001',
      status: 'active',
      class_obj: { id: 1, name: 'Class 5' },
      section: { id: 1, name: 'A' },
    },
  ],
  notifications: [
    {
      id: 1,
      title: 'Attendance Alert',
      message: 'Your attendance is low',
      notification_type: 'attendance',
      is_read: false,
      created_at: '2026-05-15T10:00:00Z',
    },
  ],
  invoices: [
    {
      id: 1,
      invoice_number: 'INV001',
      amount: 5000,
      paid_amount: 0,
      status: 'pending',
      due_date: '2026-06-15',
    },
  ],
};

/**
 * Wait for async operations
 */
export const waitFor = (callback: () => void, options?: any) => {
  return new Promise(resolve => {
    setTimeout(() => {
      callback();
      resolve(null);
    }, options?.timeout || 0);
  });
};

/**
 * Mock axios interceptors
 */
export const mockAxiosInterceptors = () => {
  return {
    request: { use: vi.fn(), eject: vi.fn() },
    response: { use: vi.fn(), eject: vi.fn() },
  };
};
