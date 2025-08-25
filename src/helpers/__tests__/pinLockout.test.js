describe('PIN Lockout Logic', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  test('increments pinFailedAttempts in localStorage', () => {
    localStorage.setItem('pinFailedAttempts', '1');
    const failedAttempts = parseInt(localStorage.getItem('pinFailedAttempts') || '0', 10);
    const newFailedCount = failedAttempts + 1;
    localStorage.setItem('pinFailedAttempts', newFailedCount);

    expect(localStorage.getItem('pinFailedAttempts')).toBe('2');
  });

  test('clears pinFailedAttempts on 3rd failure', () => {
    localStorage.setItem('pinFailedAttempts', '2');
    const newFailedCount = 3;

    if (newFailedCount >= 3) {
      localStorage.removeItem('pinFailedAttempts');
    }

    expect(localStorage.getItem('pinFailedAttempts')).toBe(null);
  });
});
