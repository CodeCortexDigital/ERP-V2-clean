import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { vi } from 'vitest'
import NotificationBell from './NotificationBell'
import { api } from '@/lib/api'

type ApiMock = {
  get: ReturnType<typeof vi.fn>
  post: ReturnType<typeof vi.fn>
}

vi.mock('@/lib/api', () => ({
  api: {
    get: vi.fn(),
    post: vi.fn(),
  },
}))

const mockApi = api as unknown as ApiMock

describe('NotificationBell', () => {
  beforeEach(() => {
    mockApi.get.mockReset()
    mockApi.post.mockReset()
  })

  it('renders unread notification count and opens dropdown', async () => {
    mockApi.get.mockImplementation((url: string) => {
      if (url.endsWith('/unread-count/')) {
        return Promise.resolve({ data: { unread_count: 2 } })
      }
      if (url.endsWith('/notifications/')) {
        return Promise.resolve({ data: [
          {
            id: '1',
            title: 'Fee invoice created',
            message: 'Invoice INV-2026-0001 has been issued.',
            notification_type: 'finance',
            is_read: false,
            created_at: '2026-05-15T12:00:00Z',
          },
        ] })
      }
      return Promise.reject(new Error('Unexpected request'))
    })

    render(<NotificationBell />)

    const badge = await screen.findByText('2')
    expect(badge).toBeInTheDocument()

    fireEvent.click(screen.getByLabelText('Notifications'))

    await waitFor(() => {
      expect(screen.getByText('Fee invoice created')).toBeInTheDocument()
      expect(screen.getByText('Mark all read')).toBeInTheDocument()
    })
  })

  it('marks a notification as read when clicked', async () => {
    mockApi.get.mockImplementation((url: string) => {
      if (url.endsWith('/unread-count/')) {
        return Promise.resolve({ data: { unread_count: 1 } })
      }
      if (url.endsWith('/notifications/')) {
        return Promise.resolve({ data: [
          {
            id: '1',
            title: 'Exam result published',
            message: 'Results are available for your student.',
            notification_type: 'exam',
            is_read: false,
            created_at: '2026-05-15T13:00:00Z',
          },
        ] })
      }
      return Promise.reject(new Error('Unexpected request'))
    })
    mockApi.post.mockResolvedValue({ data: { status: 'marked as read' } })

    render(<NotificationBell />)

    await screen.findByText('1')
    fireEvent.click(screen.getByLabelText('Notifications'))

    const markAsReadButton = await screen.findByRole('button', { name: /^Read$/i })
    fireEvent.click(markAsReadButton)

    await waitFor(() => {
      expect(mockApi.post).toHaveBeenCalledWith('/api/auth/notifications/mark-read/1/')
    })
  })
})
