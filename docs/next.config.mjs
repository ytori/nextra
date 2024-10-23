import nextra from 'nextra'

const withNextra = nextra({
  latex: true,
  defaultShowCopyCode: true
})

const nextConfig = withNextra({
  reactStrictMode: true,
  eslint: {
    // ESLint behaves weirdly in this monorepo.
    ignoreDuringBuilds: true
  },
  redirects: async () => [
    {
      source: '/docs/guide/:slug(typescript|latex|tailwind-css|mermaid)',
      destination: '/docs/guide/advanced/:slug',
      permanent: true
    },
    {
      source: '/docs/docs-theme/built-ins/:slug(callout|steps|tabs|bleed)',
      destination: '/docs/guide/built-ins/:slug',
      permanent: true
    },
    {
      source: '/docs/docs-theme/api/use-config',
      destination: '/docs/docs-theme/api',
      permanent: true
    },
    {
      source: '/docs/docs-theme/built-ins',
      destination: '/docs/guide/built-ins',
      permanent: true
    }
  ],
  webpack(config) {
    // rule.exclude doesn't work starting from Next.js 15
    const { test: _test, ...imageLoaderOptions } = config.module.rules.find(
      rule => rule.test?.test?.('.svg')
    )
    config.module.rules.push({
      test: /\.svg$/,
      oneOf: [
        {
          resourceQuery: /svgr/,
          use: ['@svgr/webpack']
        },
        imageLoaderOptions
      ]
    })
    return config
  },
  experimental: {
    optimizePackageImports: [
      // '@components/icons',
      'nextra/components'
    ]
  }
})

export default nextConfig
