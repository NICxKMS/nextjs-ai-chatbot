// biome-ignore lint/performance/noBarrelFile: "Required"
export { GET, POST } from "@/app/(auth)/auth";

// Force Node.js runtime since auth uses database queries
export const runtime = "nodejs";
