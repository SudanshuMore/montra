import { env } from 'cloudflare:workers';
import type { Runtime } from './service.ts';
export function runtime():Runtime {
 if(!env.DB||!env.BUCKET)throw new Error('Application storage unavailable');
 return {db:env.DB,bucket:env.BUCKET};
}
export function runtimeValues():Record<string,unknown>{return env as unknown as Record<string,unknown>}
