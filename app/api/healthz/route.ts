/**
 * Kubernetes Liveness Probe
 * Simple "is the process alive?" check
 *
 * @module app/api/healthz/route
 *
 * Used by K8s liveness probe to determine if the pod needs to be restarted.
 * This endpoint should:
 * - Be fast (no dependency checks)
 * - Return 200 if the server is responding
 * - Never fail unless the process is truly unresponsive
 */

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * GET /api/healthz - Liveness probe endpoint
 *
 * Returns 200 if the server process is alive and responding.
 * This is intentionally minimal - no database or cache checks.
 *
 * @returns Simple alive status with timestamp
 */
export async function GET(): Promise<Response> {
    return Response.json(
        {
            status: "alive",
            timestamp: new Date().toISOString(),
        },
        {
            status: 200,
            headers: {
                "Cache-Control": "no-cache, no-store, must-revalidate",
                "X-Probe-Type": "liveness",
            },
        }
    );
}
