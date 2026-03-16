/** @type {import('next').NextConfig} */
const nextConfig = {
  // Sarı uyarıyı çözen ve Prisma'yı tanıtan kısım
  serverExternalPackages: ["@prisma/client"],
  
  // TypeScript ve ESLint hatalarını build sırasında görmezden gel
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
};

export default nextConfig;