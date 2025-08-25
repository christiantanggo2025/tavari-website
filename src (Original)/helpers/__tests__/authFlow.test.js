jest.mock('@supabase/supabase-js', () => {
  const original = jest.requireActual('@supabase/supabase-js');
  return {
    ...original,
    createClient: () => ({
      auth: {
        signUp: jest.fn(() => ({ data: {}, error: null })),
        signInWithPassword: jest.fn(() => ({ data: { session: {} }, error: null })),
        getUser: jest.fn(() => ({ data: { user: { id: '123' } }, error: null })),
      },
    }),
  };
});
