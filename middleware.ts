import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
const csp = "default-src 'self'; script-src 'self' 'unsafe-eval'; connect-src 'self' https://*.supabase.co https://api.stripe.com https://api.openai.com;"
const permissions = "locks=(self), compute-pressure=(self), clipboard-read=(self)"
export function middleware(request: NextRequest) {
  const response = NextResponse.next()
  response.headers.set('Content-Security-Policy', csp)
  response.headers.set('Permissions-Policy', permissions)
  return response
}
