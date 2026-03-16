/** @type {import('next').NextConfig} */
const nextConfig = {
  serverExternalPackages: ["@prisma/client"],
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  // Bu satır hayati: Build sırasında sayfaları üretmeye çalışma, çalışma anına bırak
  output: 'standalone', 
};

export default nextConfig;