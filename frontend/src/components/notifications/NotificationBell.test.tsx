import { render, screen, fireEvent } from '@testing-library/react'
import { vi } from 'vitest'
import NotificationBell from './NotificationBell'
import { useNotifications } from '@/hooks/useNotifications'

// Mock the useNotifications custom hook
vi.mock('@/hooks/useNotifications', () => ({
  useNotifications: vi.fn(),
}))

const mockUseNotifications = useNotifications as any

describe('NotificationBell', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders unread notification count and opens dropdown', async () => {
    const setDropdownOpen = vi.fn()
    const fetchNotifications = vi.fn()
    const markAllAsRead = vi.fn()

    // Mock initial render state (dropdown closed, 2 unread notifications)
    mockUseNotifications.mockReturnValue({
      notifications: [
        {
          id: '1',
          title: 'Fee invoice created',
          message: 'Invoice INV-2026-0001 has been issued.',
          notification_type: 'finance',
          is_read: false,
          created_at: '2026-05-15T12:00:00Z',
        },
      ],
      unreadCount: 2,
      loading: false,
      error: null,
      dropdownOpen: false,
      setDropdownOpen,
      fetchNotifications,
      markAsRead: vi.fn(),
      markAllAsRead,
    })

    const { rerender } = render(<NotificationBell />)

    // Verify unread badge shows "2"
    const badge = await screen.findByText('2')
    expect(badge).toBeInTheDocument()

    // Trigger click on the bell icon
    fireEvent.click(screen.getByLabelText('Notifications'))
    expect(setDropdownOpen).toHaveBeenCalledWith(true)

    // Simulate dropdown opening in the next render
    mockUseNotifications.mockReturnValue({
      notifications: [
        {
          id: '1',
          title: 'Fee invoice created',
          message: 'Invoice INV-2026-0001 has been issued.',
          notification_type: 'finance',
          is_read: false,
          created_at: '2026-05-15T12:00:00Z',
        },
      ],
      unreadCount: 2,
      loading: false,
      error: null,
      dropdownOpen: true,
      setDropdownOpen,
      fetchNotifications,
      markAsRead: vi.fn(),
      markAllAsRead,
    })

    rerender(<NotificationBell />)

    // Verify dropdown contents render
    expect(screen.getByText('Fee invoice created')).toBeInTheDocument()
    expect(screen.getByText('Mark all read')).toBeInTheDocument()
  })

  it('marks a notification as read when clicked', async () => {
    const markAsRead = vi.fn()

    // Mock state with dropdown open
    mockUseNotifications.mockReturnValue({
      notifications: [
        {
          id: '1',
          title: 'Exam result published',
          message: 'Results are available for your student.',
          notification_type: 'exam',
          is_read: false,
          created_at: '2026-05-15T13:00:00Z',
        },
      ],
      unreadCount: 1,
      loading: false,
      error: null,
      dropdownOpen: true,
      setDropdownOpen: vi.fn(),
      fetchNotifications: vi.fn(),
      markAsRead,
      markAllAsRead: vi.fn(),
    })

    render(<NotificationBell />)

    // Verify item is present
    expect(screen.getByText('Exam result published')).toBeInTheDocument()

    // Click mark as read button
    const markAsReadButton = await screen.findByRole('button', { name: /^Read$/i })
    fireEvent.click(markAsReadButton)

    // Verify callback was invoked with the notification ID
    expect(markAsRead).toHaveBeenCalledWith('1')
  })
})
