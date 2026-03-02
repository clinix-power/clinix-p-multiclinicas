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
}

export default withPWA(nextConfig)