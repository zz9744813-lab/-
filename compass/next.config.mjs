/** @type {import('next').NextConfig} */
const nextConfig = {
  // standalone mode was overkill for our `next start` + systemd deploy and
  // caused asset path mistakes (CSS 404 → unstyled page). Plain build works
  // fine — `.next/static/` is served automatically by `next start`.
};

export default nextConfig;
