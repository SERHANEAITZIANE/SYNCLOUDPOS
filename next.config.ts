import createNextIntlPlugin from 'next-intl/plugin';

const withNextIntl = createNextIntlPlugin();

/** @type {import('next').NextConfig} */
const nextConfig: import('next').NextConfig = {
    typescript: {
        ignoreBuildErrors: true,
    },

    // Performance optimizations
    compress: true,
    poweredByHeader: false,

    // Tree-shake heavy barrel-export packages
    experimental: {
        optimizePackageImports: ['lucide-react', 'date-fns', 'recharts', 'react-hot-toast'],
        // Client router cache: avoid redundant server fetches on back/forward
        staleTimes: {
            dynamic: 30,  // 30s cache for dynamic pages
            static: 300,  // 5min cache for static pages
        },
    },

    images: {
        formats: ['image/avif', 'image/webp'],
        minimumCacheTTL: 86400, // 24h cache for images
        localPatterns: [
            {
                pathname: '/uploads/**',
                search: '',
            },
        ],
        remotePatterns: [
            {
                protocol: 'https',
                hostname: '**',
            },
            {
                protocol: 'http',
                hostname: 'localhost',
            }
        ],
    },

    // Bundle optimization: skip unused heavy packages from client
    serverExternalPackages: ['@prisma/client', 'bcryptjs'],

    async headers() {
        return [
            {
                source: '/:all*(svg|jpg|jpeg|png|gif|ico|webp|avif|woff|woff2)',
                locale: false,
                headers: [
                    { key: 'Cache-Control', value: 'public, max-age=31536000, immutable' }
                ],
            },
            {
                source: '/_next/static/:path*',
                headers: [
                    { key: 'Cache-Control', value: 'public, max-age=31536000, immutable' }
                ],
            },
        ]
    },

    async redirects() {
        return [
        ]
    },

    async rewrites() {
        return [];
    },
};

import { withSentryConfig } from "@sentry/nextjs";

export default withSentryConfig(withNextIntl(nextConfig), {
  // For all available options, see:
  // https://github.com/getsentry/sentry-webpack-plugin#options

  // Suppresses source map uploading logs during build
  silent: true,
  org: process.env.SENTRY_ORG,
  project: process.env.SENTRY_PROJECT,

  // For all available options, see:
  // https://docs.sentry.io/platforms/javascript/guides/nextjs/manual-setup/

  // Upload a larger set of source maps for prettier stack traces (increases build time)
  widenClientFileUpload: true,

  // Routes browser requests to Sentry through a Next.js rewrite to circumvent ad-blockers.
  // This can increase your server load as well as your hosting bill.
  tunnelRoute: "/monitoring",

  // Automatically tree-shake Sentry logger statements to reduce bundle size
  disableLogger: true,
});
