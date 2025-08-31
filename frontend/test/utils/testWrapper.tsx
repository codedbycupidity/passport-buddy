import React from 'react';
import { MockedProvider, MockedResponse } from '@apollo/client/testing';
import { BrowserRouter } from 'react-router-dom';
import { AuthProvider } from '../../src/contexts/AuthContext';
import { ToastProvider } from '../../src/contexts/ToastContext';
import { vi } from 'vitest';

interface TestWrapperProps {
  children: React.ReactNode;
  mocks?: MockedResponse[];
  user?: any;
}

// Mock implementations
export const mockToast = {
  showToast: vi.fn(),
};

export const mockAuth = {
  user: null,
  loading: false,
  error: null,
  login: vi.fn(),
  register: vi.fn(),
  logout: vi.fn(),
  verifyOtp: vi.fn(),
  requestPasswordReset: vi.fn(),
  resetPassword: vi.fn(),
  clearError: vi.fn(),
};

// Create test wrapper component
export const TestWrapper: React.FC<TestWrapperProps> = ({ 
  children, 
  mocks = [], 
  user = null 
}) => {
  // Override auth context with test user if provided
  const authValue = user ? { ...mockAuth, user } : mockAuth;

  return (
    <MockedProvider mocks={mocks} addTypename={false}>
      <BrowserRouter>
        <AuthProvider value={authValue as any}>
          <ToastProvider value={mockToast as any}>
            {children}
          </ToastProvider>
        </AuthProvider>
      </BrowserRouter>
    </MockedProvider>
  );
};

// Render helper
export const renderWithProviders = (
  ui: React.ReactElement,
  options?: {
    mocks?: MockedResponse[];
    user?: any;
  }
) => {
  return {
    ...render(ui, {
      wrapper: ({ children }) => (
        <TestWrapper {...options}>{children}</TestWrapper>
      ),
    }),
  };
};

// Common test data
export const testUser = {
  _id: '123',
  username: 'testuser',
  email: 'test@example.com',
  fullName: 'Test User',
  avatar: null,
  bio: '',
  followers: [],
  following: [],
  isPrivate: false,
  isVerified: true,
  createdAt: '2024-01-01T00:00:00Z',
};

export const testPost = {
  _id: 'post123',
  content: 'Test post content',
  author: testUser,
  images: [],
  videos: [],
  likes: [],
  comments: [],
  location: null,
  flight: null,
  createdAt: '2024-01-01T00:00:00Z',
  updatedAt: '2024-01-01T00:00:00Z',
};

// Import render from testing library
import { render } from '@testing-library/react';