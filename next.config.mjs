/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverComponentsExternalPackages: ['better-sqlite3', 'archiver'],
  },
  // Permite uploads mai mari decât default-ul de 1 MB pentru Server Actions / API
  // (limita reală a fișierelor individuale este aplicată în lib/files.ts).
  reactStrictMode: true,
};

export default nextConfig;
