import type { NextConfig } from 'next'
import nextPWA from 'next-pwa'

const withPWA = nextPWA({
  dest: 'public',
  disable: process.env.NODE_ENV === 'development',
  register: true,
  skipWaiting: true,
})

const nextConfig: NextConfig = {
  reactStrictMode: true,
  turbopack: {}, // evita o erro do Turbopack quando existe webpack config (next-pwa)
  webpack: (config) => {
    config.watchOptions = {
      ignored: [
        '**/node_modules/**',
        '**/.git/**',
        '**/.next/**',
        'C:\\DumpStack.log.tmp',
        'C:\\System Volume Information',
        'C:\\hiberfil.sys',
        'C:\\pagefile.sys',
        'C:\\swapfile.sys',
      ],
    }
    return config
  },
}

export default withPWA(nextConfig)