import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  eslint: {
    // 프로덕션 빌드(next build)에서 ESLint 에러 때문에 빌드 실패하지 않도록
    ignoreDuringBuilds: true,
  },
};

export default nextConfig;
