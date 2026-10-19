declare namespace Cloudflare {
  interface Env {
    DB?: D1Database;
    BUCKET?: R2Bucket;
    MONTRA_AUTH_MODE?: 'email' | 'platform' | 'disabled';
    MONTRA_TRUST_PLATFORM_IDENTITY?: string;
    MONTRA_AUTH_ORIGIN?: string;
    MONTRA_SUPABASE_URL?: string;
    MONTRA_SUPABASE_PUBLISHABLE_KEY?: string;
  }
}
