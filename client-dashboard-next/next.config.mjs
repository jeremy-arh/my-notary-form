/** @type {import('next').NextConfig} */
const nextConfig = {
  webpack: (config) => {
    // Corriger l'erreur "options.factory undefined" (bug webpack + lazyCompilation)
    if (config.experiments?.lazyCompilation) {
      config.experiments = { ...config.experiments, lazyCompilation: false };
    }
    return config;
  },
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "*.supabase.co",
        pathname: "/storage/v1/object/public/**",
      },
    ],
  },
};

export default nextConfig;
