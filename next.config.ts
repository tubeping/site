import type { NextConfig } from "next";
import { fileURLToPath } from "url";
import { dirname } from "path";

const __filename = fileURLToPath(import.meta.url);
const __dir = dirname(__filename);

const nextConfig: NextConfig = {
  turbopack: {
    root: __dir,
  },
  typescript: {
    // tubeping_admin이 상위에 있어서 빌드 시 간섭 — 타입체크는 별도로 수행
    ignoreBuildErrors: true,
  },
};

export default nextConfig;
