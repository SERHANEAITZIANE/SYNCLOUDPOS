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
        return {
            beforeFiles: [
                {
                    source: '/',
                    destination: '/landing.html',
                },
            ],
        };
    },
};

export default withNextIntl(nextConfig);

