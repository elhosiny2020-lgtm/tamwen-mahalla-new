export function register() {
  if (
    process.env.NODE_ENV === 'production' &&
    process.env.NEXT_PHASE !== 'phase-production-build'
  ) {
    const authSecret = process.env.AUTH_SECRET?.trim() ?? '';
    if (authSecret.length < 32) {
      throw new Error(
        'Startup aborted: AUTH_SECRET must be set and at least 32 characters long in production.'
      );
    }
  }
}
