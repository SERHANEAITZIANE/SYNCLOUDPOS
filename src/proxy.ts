import createMiddleware from 'next-intl/middleware';
import { routing } from './i18n/routing';

export default createMiddleware(routing);

export const config = {
  // Match all pathnames except for
  // - … if they start with `/api`, `/_next` or `/_vercel`
  // - … the ones containing a dot (e.g. `favicon.ico`), unless it is landing.html
  // - ... root path so landing page loads
  matcher: ['/((?!api|_next|_vercel|landing.html$|^/$|.*\\..*).*)', '/(fr|en|ar)/:path*']
};
