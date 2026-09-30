export interface ServerConfig {
  port: number
  debug: boolean
  corsOrigins: string[] | '*'
  cookieSecure: boolean
}

export function loadServerConfig(env: NodeJS.ProcessEnv): ServerConfig {
  return {
    port: Number(env.PORT ?? 3000),
    debug: env.NODE_ENV !== 'production' || env.DEBUG === 'true',
    corsOrigins: env.CORS_ORIGINS ? env.CORS_ORIGINS.split(',') : '*',
    cookieSecure: env.COOKIE_SECURE === 'true',
  }
}

export function corsHeaders(config: ServerConfig, requestOrigin: string): Record<string, string> {
  const allowOrigin = config.corsOrigins === '*' ? '*' : requestOrigin
  return {
    'Access-Control-Allow-Origin': allowOrigin,
    'Access-Control-Allow-Credentials': 'true',
    'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE',
  }
}

export function sessionCookieOptions(config: ServerConfig): { httpOnly: boolean; secure: boolean; sameSite: 'lax' } {
  return {
    httpOnly: true,
    secure: config.cookieSecure,
    sameSite: 'lax',
  }
}
