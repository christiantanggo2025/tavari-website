import useAccessProtection from '../useAccessProtection';

describe('useAccessProtection', () => {
  const originalLocation = window.location;

  beforeEach(() => {
    delete window.location;
    window.location = { href: '' };
  });

  afterEach(() => {
    window.location = originalLocation;
  });

  test('does nothing if user is active and within dates', () => {
    const profile = {
      status: 'active',
      start_date: '2023-01-01',
      end_date: '2030-01-01',
    };

    useAccessProtection(profile);
    expect(window.location.href).toBe('');
  });

  test('redirects if user is inactive', () => {
    const profile = {
      status: 'terminated',
      start_date: '2023-01-01',
      end_date: '2030-01-01',
    };

    useAccessProtection(profile);
    expect(window.location.href).toBe('/locked');
  });

  test('redirects if access is outside start/end range', () => {
    const profile = {
      status: 'active',
      start_date: '2026-01-01',
      end_date: '2026-01-30',
    };

    useAccessProtection(profile);
    expect(window.location.href).toBe('/locked');
  });
});
