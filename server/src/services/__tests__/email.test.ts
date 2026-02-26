import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock nodemailer before importing the module under test
const mockSendMail = vi.fn().mockResolvedValue({ message: '{}' });
vi.mock('nodemailer', () => ({
  default: {
    createTransport: vi.fn(() => ({
      sendMail: mockSendMail,
    })),
  },
}));

// Must import after vi.mock
const { sendEmail } = await import('../email');

describe('sendEmail', () => {
  beforeEach(() => {
    mockSendMail.mockClear();
  });

  it('calls sendMail with correct to, subject, and html', async () => {
    await sendEmail({ to: 'user@test.com', subject: 'Test', html: '<p>Hello</p>' });
    expect(mockSendMail).toHaveBeenCalledOnce();
    const call = mockSendMail.mock.calls[0][0];
    expect(call.to).toBe('user@test.com');
    expect(call.subject).toBe('Test');
    expect(call.html).toBe('<p>Hello</p>');
  });

  it('uses EMAIL_FROM env var as default from address', async () => {
    await sendEmail({ to: 'user@test.com', subject: 'Test', html: '<p>Hi</p>' });
    const call = mockSendMail.mock.calls[0][0];
    expect(call.from).toBe('test@scribe-app.com');
  });

  it('uses provided from address when specified', async () => {
    await sendEmail({ to: 'user@test.com', subject: 'Test', html: '<p>Hi</p>', from: 'custom@store.com' });
    const call = mockSendMail.mock.calls[0][0];
    expect(call.from).toBe('custom@store.com');
  });

  it('resolves without throwing on success', async () => {
    await expect(
      sendEmail({ to: 'user@test.com', subject: 'Test', html: '<p>Hi</p>' })
    ).resolves.toBeUndefined();
  });
});
