"use client";

import { useEffect, useState } from "react";

type Metrics = {
  timestamp: string;
  uptime: string;
  memory: {
    total: string;
    free: string;
    used: string;
    percentage: string;
  };
  cpu: {
    cores: number;
    model: string;
    speed: string;
    loadAverage: number[];
    usage: Array<{
      user: string;
      system: string;
      idle: string;
      irq: string;
    }>;
  };
  system: {
    platform: string;
    arch: string;
    hostname: string;
    type: string;
    release: string;
  };
  network: {
    interfaces: Array<{
      name: string;
      addresses: Array<{
        family: string;
        address: string;
        netmask: string;
        mac: string;
      }>;
    }>;
  };
  process: {
    pid: number;
    memory: {
      rss: string;
      heapTotal: string;
      heapUsed: string;
      external: string;
      arrayBuffers: string;
    };
    uptime: string;
    cpuUsage: {
      user: string;
      system: string;
    };
  };
};

type MetricsMonitorProps = {
  pollingInterval?: number;
  onMetricsUpdate?: (metrics: Metrics) => void;
};

// Regex to extract numeric value from formatted strings
const percentagePattern = /(\d+\.?\d*)/;

// Helper to parse percentage from formatted string
const parsePercentage = (percentStr: string): number => {
  const match = percentStr.match(percentagePattern);
  return match ? Number.parseFloat(match[1]) : 0;
};

export function MetricsMonitor({
  pollingInterval = 5000,
  onMetricsUpdate,
}: MetricsMonitorProps) {
  const [metrics, setMetrics] = useState<Metrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchMetrics = async () => {
      try {
        const response = await fetch("/api/metrics", {
          cache: "no-store",
        });

        if (!response.ok) {
          throw new Error(`Failed to fetch metrics: ${response.statusText}`);
        }

        const data = (await response.json()) as Metrics;
        setMetrics(data);
        setError(null);
        onMetricsUpdate?.(data);
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : "Unknown error";
        setError(errorMessage);
        console.error("Error fetching metrics:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchMetrics();
    const interval = setInterval(fetchMetrics, pollingInterval);

    return () => clearInterval(interval);
  }, [pollingInterval, onMetricsUpdate]);

  if (loading) {
    return (
      <div className="rounded-lg border border-gray-200 p-4 dark:border-gray-800">
        <p className="text-gray-600 text-sm dark:text-gray-400">
          Loading metrics...
        </p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 p-4 dark:border-red-900 dark:bg-red-950">
        <p className="font-medium text-red-800 text-sm dark:text-red-200">
          Error loading metrics
        </p>
        <p className="text-red-600 text-xs dark:text-red-400">{error}</p>
      </div>
    );
  }

  if (!metrics) {
    return null;
  }

  // Parse percentage values from formatted strings for progress bars
  const memPercent = parsePercentage(metrics.memory.percentage);
  const heapPercent = parsePercentage(metrics.process.memory.heapUsed);

  return (
    <div className="space-y-6">
      {/* Header with Timestamp */}
      <div className="flex items-center justify-between rounded-lg border border-gray-200 bg-gradient-to-r from-blue-500 to-indigo-600 p-6 text-white dark:border-gray-700">
        <div>
          <h2 className="font-bold text-2xl">System Dashboard</h2>
          <p className="mt-1 text-blue-100">Real-time metrics monitoring</p>
        </div>
        <div className="text-right">
          <p className="text-blue-100 text-sm">Last Updated</p>
          <p className="font-mono text-lg">
            {new Date(metrics.timestamp).toLocaleTimeString()}
          </p>
        </div>
      </div>

      {/* Quick Stats Row */}
      <div className="grid gap-4 md:grid-cols-4">
        <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-800 dark:bg-gray-900">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-semibold text-gray-500 text-xs dark:text-gray-400">
                UPTIME
              </p>
              <p className="mt-2 font-bold text-2xl text-gray-900 dark:text-white">
                {metrics.uptime}
              </p>
            </div>
            <div className="rounded-full bg-blue-100 p-3 dark:bg-blue-900/30">
              <div className="h-6 w-6 text-blue-600 dark:text-blue-400">⏱️</div>
            </div>
          </div>
        </div>

        <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-800 dark:bg-gray-900">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-semibold text-gray-500 text-xs dark:text-gray-400">
                CPU CORES
              </p>
              <p className="mt-2 font-bold text-2xl text-gray-900 dark:text-white">
                {metrics.cpu.cores}
              </p>
            </div>
            <div className="rounded-full bg-green-100 p-3 dark:bg-green-900/30">
              <div className="h-6 w-6 text-green-600 dark:text-green-400">
                ⚙️
              </div>
            </div>
          </div>
        </div>

        <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-800 dark:bg-gray-900">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-semibold text-gray-500 text-xs dark:text-gray-400">
                CPU SPEED
              </p>
              <p className="mt-2 font-bold text-2xl text-gray-900 dark:text-white">
                {metrics.cpu.speed}
              </p>
            </div>
            <div className="rounded-full bg-purple-100 p-3 dark:bg-purple-900/30">
              <div className="h-6 w-6 text-purple-600 dark:text-purple-400">
                ⚡
              </div>
            </div>
          </div>
        </div>

        <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-800 dark:bg-gray-900">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-semibold text-gray-500 text-xs dark:text-gray-400">
                HOSTNAME
              </p>
              <p className="mt-2 truncate font-bold text-gray-900 text-lg dark:text-white">
                {metrics.system.hostname}
              </p>
            </div>
            <div className="rounded-full bg-orange-100 p-3 dark:bg-orange-900/30">
              <div className="h-6 w-6 text-orange-600 dark:text-orange-400">
                🖥️
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Memory Section */}
      <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-900">
        <div className="mb-6 flex items-center gap-2">
          <div className="h-8 w-1 rounded-full bg-blue-500" />
          <h3 className="font-bold text-gray-900 text-xl dark:text-white">
            Memory Usage
          </h3>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          {/* System Memory */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <p className="font-semibold text-gray-700 dark:text-gray-300">
                System Memory
              </p>
              <span className="rounded-full bg-blue-100 px-3 py-1 font-mono font-semibold text-blue-700 text-sm dark:bg-blue-900/30 dark:text-blue-300">
                {metrics.memory.percentage}
              </span>
            </div>
            <div className="space-y-2">
              <div className="h-3 rounded-full bg-gray-200 dark:bg-gray-700">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-blue-400 to-blue-600 transition-all duration-300"
                  style={{ width: `${memPercent}%` }}
                />
              </div>
              <p className="text-gray-600 text-sm dark:text-gray-400">
                <span className="font-semibold text-gray-900 dark:text-white">
                  {metrics.memory.used}
                </span>
                {" / "}
                <span className="text-gray-500 dark:text-gray-500">
                  {metrics.memory.total}
                </span>
              </p>
            </div>
          </div>

          {/* Heap Memory */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <p className="font-semibold text-gray-700 dark:text-gray-300">
                Heap Memory (Process)
              </p>
              <span className="rounded-full bg-purple-100 px-3 py-1 font-mono font-semibold text-purple-700 text-sm dark:bg-purple-900/30 dark:text-purple-300">
                {heapPercent.toFixed(2)}%
              </span>
            </div>
            <div className="space-y-2">
              <div className="h-3 rounded-full bg-gray-200 dark:bg-gray-700">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-purple-400 to-purple-600 transition-all duration-300"
                  style={{ width: `${heapPercent}%` }}
                />
              </div>
              <p className="text-gray-600 text-sm dark:text-gray-400">
                <span className="font-semibold text-gray-900 dark:text-white">
                  {metrics.process.memory.heapUsed}
                </span>
                {" / "}
                <span className="text-gray-500 dark:text-gray-500">
                  {metrics.process.memory.heapTotal}
                </span>
              </p>
            </div>
          </div>
        </div>

        {/* Additional Memory Details */}
        <div className="mt-6 grid gap-3 border-gray-200 border-t pt-6 md:grid-cols-3 dark:border-gray-800">
          <div className="rounded bg-gray-50 p-3 dark:bg-gray-800">
            <p className="font-semibold text-gray-500 text-xs dark:text-gray-400">
              RSS
            </p>
            <p className="mt-1 font-semibold text-gray-900 dark:text-white">
              {metrics.process.memory.rss}
            </p>
          </div>
          <div className="rounded bg-gray-50 p-3 dark:bg-gray-800">
            <p className="font-semibold text-gray-500 text-xs dark:text-gray-400">
              EXTERNAL
            </p>
            <p className="mt-1 font-semibold text-gray-900 dark:text-white">
              {metrics.process.memory.external}
            </p>
          </div>
          <div className="rounded bg-gray-50 p-3 dark:bg-gray-800">
            <p className="font-semibold text-gray-500 text-xs dark:text-gray-400">
              ARRAY BUFFERS
            </p>
            <p className="mt-1 font-semibold text-gray-900 dark:text-white">
              {metrics.process.memory.arrayBuffers}
            </p>
          </div>
        </div>
      </div>

      {/* CPU Section */}
      <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-900">
        <div className="mb-6 flex items-center gap-2">
          <div className="h-8 w-1 rounded-full bg-green-500" />
          <h3 className="font-bold text-gray-900 text-xl dark:text-white">
            CPU Information
          </h3>
        </div>

        <div className="mb-6 space-y-3">
          <div>
            <p className="mb-2 font-semibold text-gray-600 text-sm dark:text-gray-400">
              Processor
            </p>
            <p className="text-gray-900 dark:text-white">{metrics.cpu.model}</p>
          </div>
          <div>
            <p className="mb-2 font-semibold text-gray-600 text-sm dark:text-gray-400">
              Load Average (1m, 5m, 15m)
            </p>
            <div className="flex gap-3">
              {metrics.cpu.loadAverage.map((load, idx) => (
                <div
                  className="rounded bg-green-50 px-4 py-2 dark:bg-green-900/20"
                  // biome-ignore lint/suspicious/noArrayIndexKey: Stable array, load average indices don't change
                  key={idx}
                >
                  <p className="text-gray-600 text-xs dark:text-gray-400">
                    {["1m", "5m", "15m"][idx]}
                  </p>
                  <p className="font-semibold text-gray-900 dark:text-white">
                    {load.toFixed(2)}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* CPU Usage by Core */}
        <div className="border-gray-200 border-t pt-6 dark:border-gray-800">
          <p className="mb-4 font-semibold text-gray-900 dark:text-white">
            Per-Core Usage ({metrics.cpu.usage.length} cores)
          </p>
          <div className="grid max-h-96 gap-2 overflow-y-auto md:grid-cols-2">
            {metrics.cpu.usage.map((core, idx) => (
              <div
                className="rounded border border-gray-200 bg-gray-50 p-3 text-sm dark:border-gray-700 dark:bg-gray-800"
                // biome-ignore lint/suspicious/noArrayIndexKey: Stable array, cores don't change
                key={idx}
              >
                <p className="mb-2 font-semibold text-gray-700 dark:text-gray-300">
                  Core {idx}
                </p>
                <div className="space-y-1 font-mono text-xs">
                  <div className="flex justify-between text-gray-600 dark:text-gray-400">
                    <span>User:</span>
                    <span className="font-semibold text-gray-900 dark:text-white">
                      {core.user}
                    </span>
                  </div>
                  <div className="flex justify-between text-gray-600 dark:text-gray-400">
                    <span>System:</span>
                    <span className="font-semibold text-gray-900 dark:text-white">
                      {core.system}
                    </span>
                  </div>
                  <div className="flex justify-between text-gray-600 dark:text-gray-400">
                    <span>Idle:</span>
                    <span className="font-semibold text-gray-900 dark:text-white">
                      {core.idle}
                    </span>
                  </div>
                  <div className="flex justify-between text-gray-600 dark:text-gray-400">
                    <span>IRQ:</span>
                    <span className="font-semibold text-gray-900 dark:text-white">
                      {core.irq}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Process Section */}
      <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-900">
        <div className="mb-6 flex items-center gap-2">
          <div className="h-8 w-1 rounded-full bg-orange-500" />
          <h3 className="font-bold text-gray-900 text-xl dark:text-white">
            Process Information
          </h3>
        </div>

        <div className="grid gap-4 md:grid-cols-4">
          <div className="rounded-lg bg-orange-50 p-4 dark:bg-orange-900/20">
            <p className="font-semibold text-gray-600 text-xs dark:text-gray-400">
              PID
            </p>
            <p className="mt-2 font-bold font-mono text-gray-900 text-lg dark:text-white">
              {metrics.process.pid}
            </p>
          </div>
          <div className="rounded-lg bg-orange-50 p-4 dark:bg-orange-900/20">
            <p className="font-semibold text-gray-600 text-xs dark:text-gray-400">
              UPTIME
            </p>
            <p className="mt-2 font-bold font-mono text-gray-900 text-lg dark:text-white">
              {metrics.process.uptime}
            </p>
          </div>
          <div className="rounded-lg bg-orange-50 p-4 dark:bg-orange-900/20">
            <p className="font-semibold text-gray-600 text-xs dark:text-gray-400">
              USER CPU
            </p>
            <p className="mt-2 font-bold font-mono text-gray-900 text-lg dark:text-white">
              {metrics.process.cpuUsage.user}
            </p>
          </div>
          <div className="rounded-lg bg-orange-50 p-4 dark:bg-orange-900/20">
            <p className="font-semibold text-gray-600 text-xs dark:text-gray-400">
              SYSTEM CPU
            </p>
            <p className="mt-2 font-bold font-mono text-gray-900 text-lg dark:text-white">
              {metrics.process.cpuUsage.system}
            </p>
          </div>
        </div>
      </div>

      {/* System Section */}
      <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-900">
        <div className="mb-6 flex items-center gap-2">
          <div className="h-8 w-1 rounded-full bg-red-500" />
          <h3 className="font-bold text-gray-900 text-xl dark:text-white">
            System Information
          </h3>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <div>
            <p className="font-semibold text-gray-600 text-xs dark:text-gray-400">
              OS
            </p>
            <p className="mt-2 font-semibold text-gray-900 dark:text-white">
              {metrics.system.type}
            </p>
            <p className="text-gray-600 text-xs dark:text-gray-400">
              {metrics.system.platform}
            </p>
          </div>
          <div>
            <p className="font-semibold text-gray-600 text-xs dark:text-gray-400">
              ARCHITECTURE
            </p>
            <p className="mt-2 font-semibold text-gray-900 dark:text-white">
              {metrics.system.arch}
            </p>
          </div>
          <div>
            <p className="font-semibold text-gray-600 text-xs dark:text-gray-400">
              KERNEL VERSION
            </p>
            <p className="mt-2 font-mono font-semibold text-gray-900 text-sm dark:text-white">
              {metrics.system.release}
            </p>
          </div>
        </div>
      </div>

      {/* Network Section */}
      <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-900">
        <div className="mb-6 flex items-center gap-2">
          <div className="h-8 w-1 rounded-full bg-cyan-500" />
          <h3 className="font-bold text-gray-900 text-xl dark:text-white">
            Network Interfaces
          </h3>
        </div>

        <div className="space-y-4">
          {metrics.network.interfaces.map((iface) => (
            <div
              className="rounded-lg border border-gray-200 bg-gray-50 p-4 dark:border-gray-700 dark:bg-gray-800"
              key={iface.name}
            >
              <h4 className="mb-3 font-semibold text-gray-900 dark:text-white">
                {iface.name}
              </h4>
              <div className="grid gap-3 md:grid-cols-2">
                {iface.addresses.map((addr) => (
                  <div className="space-y-1" key={addr.address}>
                    <div className="flex items-center gap-2">
                      <span className="rounded bg-cyan-100 px-2 py-1 font-mono font-semibold text-cyan-700 text-xs dark:bg-cyan-900/30 dark:text-cyan-300">
                        {addr.family}
                      </span>
                    </div>
                    <p className="font-mono text-gray-700 text-sm dark:text-gray-300">
                      {addr.address}
                    </p>
                    <p className="font-mono text-gray-500 text-xs dark:text-gray-500">
                      MAC: {addr.mac}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
