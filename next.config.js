/** @type {import('next').NextConfig} */
const config = {
  // Keep your existing Docker/Build optimizations!
  output: 'standalone', 
  swcMinify: true,

  // Add the new CDN whitelist for your Next.js <Image /> components
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'd3lbexrq4gc5jo.cloudfront.net', // TODO: Replace with your actual CloudFront domain from Terraform
        port: '',
        pathname: '/**', 
      },
    ],
  },
};

module.exports = config;
