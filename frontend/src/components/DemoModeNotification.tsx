import React, { useState, useEffect } from 'react';

export const DemoModeNotification: React.FC = () => {
  const [isVisible, setIsVisible] = useState(true);
  const [isMinimized, setIsMinimized] = useState(false);

  useEffect(() => {
    // Auto-minimize after 5 seconds
    const timer = setTimeout(() => {
      setIsMinimized(true);
    }, 5000);

    return () => clearTimeout(timer);
  }, []);

  if (!isVisible) return null;

  return (
    <>
      {/* Minimized state - floating button */}
      {isMinimized && (
        <div
          onClick={() => setIsMinimized(false)}
          style={{
            position: 'fixed',
            bottom: '20px',
            right: '20px',
            width: '60px',
            height: '60px',
            borderRadius: '50%',
            background: 'linear-gradient(135deg, var(--pb-medium-purple) 0%, var(--pb-dark-purple) 100%)',
            color: 'white',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '24px',
            cursor: 'pointer',
            boxShadow: '0 4px 20px rgba(139, 92, 246, 0.3)',
            transition: 'all 0.3s ease',
            zIndex: 1000,
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = 'scale(1.1)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = 'scale(1)';
          }}
        >
          🎭
        </div>
      )}

      {/* Expanded state - info card */}
      {!isMinimized && (
        <div
          style={{
            position: 'fixed',
            bottom: '20px',
            right: '20px',
            width: '320px',
            background: 'white',
            borderRadius: '16px',
            boxShadow: '0 10px 40px rgba(0, 0, 0, 0.15)',
            padding: '20px',
            zIndex: 1000,
            animation: 'slideUp 0.3s ease-out',
          }}
        >
          {/* Header */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: '12px',
          }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
            }}>
              <span style={{ fontSize: '20px' }}>🎭</span>
              <h3 style={{
                margin: 0,
                fontSize: '16px',
                fontWeight: '600',
                color: '#1f2937',
              }}>
                Demo Mode Active
              </h3>
            </div>
            <button
              onClick={() => setIsMinimized(true)}
              style={{
                background: 'none',
                border: 'none',
                fontSize: '20px',
                cursor: 'pointer',
                color: '#6b7280',
                padding: '4px',
                borderRadius: '4px',
                transition: 'background 0.2s',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = '#f3f4f6';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'none';
              }}
            >
              −
            </button>
          </div>

          {/* Content */}
          <div style={{
            fontSize: '14px',
            color: '#4b5563',
            lineHeight: '1.5',
          }}>
            <p style={{ margin: '0 0 12px 0' }}>
              You're viewing a demo version with mock data.
            </p>
            
            <div style={{
              background: '#f3f4f6',
              borderRadius: '8px',
              padding: '12px',
              marginBottom: '12px',
            }}>
              <p style={{ margin: '0 0 4px 0', fontWeight: '500', color: '#1f2937' }}>
                Demo Credentials:
              </p>
              <p style={{ margin: 0, fontFamily: 'monospace', fontSize: '13px' }}>
                demo@passport-buddy.com<br />
                Password: demo123
              </p>
            </div>

            <div style={{
              display: 'flex',
              gap: '8px',
              marginTop: '16px',
            }}>
              <button
                onClick={() => {
                  // Copy credentials to clipboard
                  navigator.clipboard.writeText('demo@passport-buddy.com');
                  alert('Email copied to clipboard!');
                }}
                style={{
                  flex: 1,
                  padding: '8px 12px',
                  background: 'var(--pb-medium-purple)',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  fontSize: '13px',
                  fontWeight: '500',
                  cursor: 'pointer',
                  transition: 'background 0.2s',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = '#7c3aed';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'var(--pb-medium-purple)';
                }}
              >
                Copy Email
              </button>
              <button
                onClick={() => {
                  localStorage.removeItem('demoMode');
                  // Force a full page reload to restart the app without demo mode
                  window.location.href = window.location.origin + window.location.pathname;
                }}
                style={{
                  padding: '8px 16px',
                  background: '#ef4444',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  fontSize: '13px',
                  fontWeight: '500',
                  cursor: 'pointer',
                  transition: 'background 0.2s',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = '#dc2626';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = '#ef4444';
                }}
              >
                Exit Demo
              </button>
              <button
                onClick={() => setIsVisible(false)}
                style={{
                  padding: '8px 16px',
                  background: '#f3f4f6',
                  color: '#4b5563',
                  border: 'none',
                  borderRadius: '8px',
                  fontSize: '13px',
                  fontWeight: '500',
                  cursor: 'pointer',
                  transition: 'background 0.2s',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = '#e5e7eb';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = '#f3f4f6';
                }}
              >
                Hide
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Animation keyframes */}
      <style>
        {`
          @keyframes slideUp {
            from {
              transform: translateY(100px);
              opacity: 0;
            }
            to {
              transform: translateY(0);
              opacity: 1;
            }
          }
        `}
      </style>
    </>
  );
};