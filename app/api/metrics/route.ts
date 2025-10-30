import {
  arch,
  freemem,
  cpus as getSystemCpus,
  type as getSystemType,
  uptime as getSystemUptime,
  hostname,
  loadavg,
  networkInterfaces,
  platform,
  release,
  totalmem,
} from "node:os";
import { NextResponse } from "next/server";

// Regex pattern for percentage parsing
const percentagePattern = /(\d+\.?\d*)/;

/** Metrics type with formatted values including units (MB, seconds, milliseconds) */
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
      heapPercentage: string;
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

// Helper functions to format values with units - optimized for performance
const formatMemory = (bytes: number): string => {
  const mb = bytes / 1_048_576; // 1MB in bytes
  return mb > 1024 ? `${(mb / 1024).toFixed(2)} GB` : `${mb.toFixed(2)} MB`;
};

const formatMilliseconds = (ms: number): string => {
  return ms < 1000 ? `${ms.toFixed(2)} ms` : `${(ms / 1000).toFixed(2)} s`;
};

const formatMicroseconds = (us: number): string => {
  const ms = us / 1000;
  return ms < 1000 ? `${ms.toFixed(2)} ms` : `${(ms / 1000).toFixed(2)} s`;
};

const formatSeconds = (seconds: number): string => {
  if (seconds < 60) {
    return `${seconds.toFixed(2)} s`;
  }
  if (seconds < 3600) {
    return `${(seconds / 60).toFixed(2)} m`;
  }
  if (seconds < 86_400) {
    return `${(seconds / 3600).toFixed(2)} h`;
  }
  return `${(seconds / 86_400).toFixed(2)} d`;
};

function getMetrics(): Metrics {
  // Collect all data upfront to minimize redundant system calls
  const systemCpus = getSystemCpus();
  const totalMemory = totalmem();
  const freeMemory = freemem();
  const usedMemory = totalMemory - freeMemory;
  const memoryPercentage = (usedMemory / totalMemory) * 100;

  // Format memory values only once
  const totalMemStr = formatMemory(totalMemory);
  const freeMemStr = formatMemory(freeMemory);
  const usedMemStr = formatMemory(usedMemory);

  // Get process memory once
  const memUsage = process.memoryUsage();
  const heapUsedStr = formatMemory(memUsage.heapUsed);
  const heapTotalStr = formatMemory(memUsage.heapTotal);
  const heapPercentage = (memUsage.heapUsed / memUsage.heapTotal) * 100;

  // Format CPU usage strings in a single pass
  const cpuUsageFormatted = systemCpus.map((cpu) => ({
    user: formatMilliseconds(cpu.times.user),
    system: formatMilliseconds(cpu.times.sys),
    idle: formatMilliseconds(cpu.times.idle),
    irq: formatMilliseconds(cpu.times.irq),
  }));

  // Get network interfaces once
  const networkData = Object.entries(networkInterfaces()).map(
    ([name, addresses]) => ({
      name,
      addresses: (addresses || []).map((addr) => ({
        family: addr.family,
        address: addr.address,
        netmask: addr.netmask,
        mac: addr.mac,
      })),
    })
  );

  const cpuUsage = process.cpuUsage();
  const systemUptime = getSystemUptime();
  const processUptime = process.uptime();

  return {
    timestamp: new Date().toISOString(),
    uptime: formatSeconds(systemUptime),
    memory: {
      total: totalMemStr,
      free: freeMemStr,
      used: usedMemStr,
      percentage: `${memoryPercentage.toFixed(2)}%`,
    },
    cpu: {
      cores: systemCpus.length,
      model: systemCpus[0]?.model ?? "Unknown",
      speed: `${((systemCpus[0]?.speed ?? 0) / 1000).toFixed(2)} GHz`,
      loadAverage: loadavg(),
      usage: cpuUsageFormatted,
    },
    system: {
      platform: platform(),
      arch: arch(),
      hostname: hostname(),
      type: getSystemType(),
      release: release(),
    },
    network: {
      interfaces: networkData,
    },
    process: {
      pid: process.pid,
      memory: {
        rss: formatMemory(memUsage.rss),
        heapTotal: heapTotalStr,
        heapUsed: heapUsedStr,
        heapPercentage: `${heapPercentage.toFixed(2)}%`,
        external: formatMemory(memUsage.external),
        arrayBuffers: formatMemory(memUsage.arrayBuffers),
      },
      uptime: formatSeconds(processUptime),
      cpuUsage: {
        user: formatMicroseconds(cpuUsage.user),
        system: formatMicroseconds(cpuUsage.system),
      },
    },
  };
}

function generateHTMLPage(metrics: Metrics): string {
  // Pre-calculate percentage once
  const parsePercentage = (percentStr: string): number => {
    const match = percentStr.match(percentagePattern);
    return match ? Number.parseFloat(match[1]) : 0;
  };

  const memPercent = parsePercentage(metrics.memory.percentage);
  const heapPercent = parsePercentage(metrics.process.memory.heapPercentage);
  const timestamp = new Date(metrics.timestamp);
  const timeStr = timestamp.toLocaleTimeString();
  const dateStr = timestamp.toLocaleString();

  // Build load average HTML in one pass
  const loadAvgHtml = metrics.cpu.loadAverage
    .map(
      (load, idx) =>
        `<div class="rounded bg-green-50 px-4 py-2 dark:bg-green-900/20"><p class="text-xs text-gray-600 dark:text-gray-400">${["1m", "5m", "15m"][idx]}</p><p class="font-semibold text-gray-900 dark:text-white">${load.toFixed(2)}</p></div>`
    )
    .join("");

  // Build CPU cores HTML in one pass
  const cpuCoresHtml = metrics.cpu.usage
    .map(
      (core, idx) =>
        `<div class="rounded border border-gray-200 bg-gray-50 p-3 text-sm dark:border-gray-700 dark:bg-gray-800"><p class="mb-2 font-semibold text-gray-700 dark:text-gray-300">Core ${idx}</p><div class="space-y-1 font-mono text-xs"><div class="flex justify-between text-gray-600 dark:text-gray-400"><span>User:</span><span class="font-semibold text-gray-900 dark:text-white">${core.user}</span></div><div class="flex justify-between text-gray-600 dark:text-gray-400"><span>System:</span><span class="font-semibold text-gray-900 dark:text-white">${core.system}</span></div><div class="flex justify-between text-gray-600 dark:text-gray-400"><span>Idle:</span><span class="font-semibold text-gray-900 dark:text-white">${core.idle}</span></div><div class="flex justify-between text-gray-600 dark:text-gray-400"><span>IRQ:</span><span class="font-semibold text-gray-900 dark:text-white">${core.irq}</span></div></div></div>`
    )
    .join("");

  // Build network interfaces HTML in one pass
  const networkHtml = metrics.network.interfaces
    .map(
      (iface) =>
        `<div class="rounded-lg border border-gray-200 bg-gray-50 p-4 dark:border-gray-700 dark:bg-gray-800"><h3 class="mb-3 font-semibold text-gray-900 dark:text-white">${iface.name}</h3><div class="grid gap-3 md:grid-cols-2">${iface.addresses
          .map(
            (addr) =>
              `<div class="space-y-1"><div class="flex items-center gap-2"><span class="rounded bg-cyan-100 px-2 py-1 font-mono text-xs font-semibold text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-300">${addr.family}</span></div><p class="font-mono text-sm text-gray-700 dark:text-gray-300">${addr.address}</p><p class="font-mono text-xs text-gray-500 dark:text-gray-500">MAC: ${addr.mac}</p></div>`
          )
          .join("")}</div></div>`
    )
    .join("");

  return `<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><title>System Metrics Dashboard</title><script src="https://cdn.tailwindcss.com"></script><style>*{-webkit-font-smoothing:antialiased;-moz-osx-font-smoothing:grayscale}@keyframes spin{to{transform:rotate(360deg)}}.animate-spin{animation:spin 1s linear infinite}</style></head><body class="bg-gray-50 dark:bg-gray-950"><main class="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-950 dark:to-gray-900 p-4 md:p-8"><div class="mx-auto max-w-7xl space-y-6"><div class="flex flex-col gap-4 md:flex-row md:items-center md:justify-between rounded-lg border border-gray-200 bg-gradient-to-r from-blue-500 to-indigo-600 p-6 text-white dark:border-gray-700"><div><h1 class="text-3xl font-bold">System Dashboard</h1><p class="mt-2 text-blue-100">Real-time metrics monitoring</p></div><div class="text-right"><p class="text-sm text-blue-100">Last Updated</p><p class="font-mono text-2xl font-bold">${timeStr}</p></div></div><div class="grid gap-4 md:grid-cols-4"><div class="rounded-lg border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-800 dark:bg-gray-900"><div class="flex items-center justify-between"><div><p class="text-xs font-semibold text-gray-500 dark:text-gray-400">UPTIME</p><p class="mt-2 text-2xl font-bold text-gray-900 dark:text-white">${metrics.uptime}</p></div><div class="rounded-full bg-blue-100 p-3 dark:bg-blue-900/30">⏱️</div></div></div><div class="rounded-lg border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-800 dark:bg-gray-900"><div class="flex items-center justify-between"><div><p class="text-xs font-semibold text-gray-500 dark:text-gray-400">CPU CORES</p><p class="mt-2 text-2xl font-bold text-gray-900 dark:text-white">${metrics.cpu.cores}</p></div><div class="rounded-full bg-green-100 p-3 dark:bg-green-900/30">⚙️</div></div></div><div class="rounded-lg border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-800 dark:bg-gray-900"><div class="flex items-center justify-between"><div><p class="text-xs font-semibold text-gray-500 dark:text-gray-400">CPU SPEED</p><p class="mt-2 text-2xl font-bold text-gray-900 dark:text-white">${metrics.cpu.speed}</p></div><div class="rounded-full bg-purple-100 p-3 dark:bg-purple-900/30">⚡</div></div></div><div class="rounded-lg border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-800 dark:bg-gray-900"><div class="flex items-center justify-between"><div><p class="text-xs font-semibold text-gray-500 dark:text-gray-400">HOSTNAME</p><p class="mt-2 truncate text-lg font-bold text-gray-900 dark:text-white">${metrics.system.hostname}</p></div><div class="rounded-full bg-orange-100 p-3 dark:bg-orange-900/30">🖥️</div></div></div></div><div class="rounded-lg border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-900"><div class="mb-6 flex items-center gap-2"><div class="h-8 w-1 rounded-full bg-blue-500"></div><h2 class="text-xl font-bold text-gray-900 dark:text-white">Memory Usage</h2></div><div class="grid gap-6 md:grid-cols-2"><div class="space-y-3"><div class="flex items-center justify-between"><p class="font-semibold text-gray-700 dark:text-gray-300">System Memory</p><span class="rounded-full bg-blue-100 px-3 py-1 font-mono text-sm font-semibold text-blue-700 dark:bg-blue-900/30 dark:text-blue-300">${metrics.memory.percentage}</span></div><div class="space-y-2"><div class="h-3 rounded-full bg-gray-200 dark:bg-gray-700"><div class="h-full rounded-full bg-gradient-to-r from-blue-400 to-blue-600 transition-all duration-300" style="width: ${memPercent}%"></div></div><p class="text-sm text-gray-600 dark:text-gray-400"><span class="font-semibold text-gray-900 dark:text-white">${metrics.memory.used}</span> / <span class="text-gray-500 dark:text-gray-500">${metrics.memory.total}</span></p></div></div><div class="space-y-3"><div class="flex items-center justify-between"><p class="font-semibold text-gray-700 dark:text-gray-300">Heap Memory (Process)</p><span class="rounded-full bg-purple-100 px-3 py-1 font-mono text-sm font-semibold text-purple-700 dark:bg-purple-900/30 dark:text-purple-300">${metrics.process.memory.heapPercentage}</span></div><div class="space-y-2"><div class="h-3 rounded-full bg-gray-200 dark:bg-gray-700"><div class="h-full rounded-full bg-gradient-to-r from-purple-400 to-purple-600 transition-all duration-300" style="width: ${heapPercent}%"></div></div><p class="text-sm text-gray-600 dark:text-gray-400"><span class="font-semibold text-gray-900 dark:text-white">${metrics.process.memory.heapUsed}</span> / <span class="text-gray-500 dark:text-gray-500">${metrics.process.memory.heapTotal}</span></p></div></div></div><div class="mt-6 grid gap-3 border-t border-gray-200 pt-6 dark:border-gray-800 md:grid-cols-3"><div class="rounded bg-gray-50 p-3 dark:bg-gray-800"><p class="text-xs font-semibold text-gray-500 dark:text-gray-400">RSS</p><p class="mt-1 font-semibold text-gray-900 dark:text-white">${metrics.process.memory.rss}</p></div><div class="rounded bg-gray-50 p-3 dark:bg-gray-800"><p class="text-xs font-semibold text-gray-500 dark:text-gray-400">EXTERNAL</p><p class="mt-1 font-semibold text-gray-900 dark:text-white">${metrics.process.memory.external}</p></div><div class="rounded bg-gray-50 p-3 dark:bg-gray-800"><p class="text-xs font-semibold text-gray-500 dark:text-gray-400">ARRAY BUFFERS</p><p class="mt-1 font-semibold text-gray-900 dark:text-white">${metrics.process.memory.arrayBuffers}</p></div></div></div><div class="rounded-lg border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-900"><div class="mb-6 flex items-center gap-2"><div class="h-8 w-1 rounded-full bg-green-500"></div><h2 class="text-xl font-bold text-gray-900 dark:text-white">CPU Information</h2></div><div class="mb-6 space-y-3"><div><p class="mb-2 text-sm font-semibold text-gray-600 dark:text-gray-400">Processor</p><p class="text-gray-900 dark:text-white">${metrics.cpu.model}</p></div><div><p class="mb-2 text-sm font-semibold text-gray-600 dark:text-gray-400">Load Average (1m, 5m, 15m)</p><div class="flex gap-3">${loadAvgHtml}</div></div></div><div class="border-t border-gray-200 pt-6 dark:border-gray-800"><p class="mb-4 font-semibold text-gray-900 dark:text-white">Per-Core Usage (${metrics.cpu.usage.length} cores)</p><div class="grid max-h-96 gap-2 overflow-y-auto md:grid-cols-2">${cpuCoresHtml}</div></div></div><div class="rounded-lg border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-900"><div class="mb-6 flex items-center gap-2"><div class="h-8 w-1 rounded-full bg-orange-500"></div><h2 class="text-xl font-bold text-gray-900 dark:text-white">Process Information</h2></div><div class="grid gap-4 md:grid-cols-4"><div class="rounded-lg bg-orange-50 p-4 dark:bg-orange-900/20"><p class="text-xs font-semibold text-gray-600 dark:text-gray-400">PID</p><p class="mt-2 font-mono text-lg font-bold text-gray-900 dark:text-white">${metrics.process.pid}</p></div><div class="rounded-lg bg-orange-50 p-4 dark:bg-orange-900/20"><p class="text-xs font-semibold text-gray-600 dark:text-gray-400">UPTIME</p><p class="mt-2 font-mono text-lg font-bold text-gray-900 dark:text-white">${metrics.process.uptime}</p></div><div class="rounded-lg bg-orange-50 p-4 dark:bg-orange-900/20"><p class="text-xs font-semibold text-gray-600 dark:text-gray-400">USER CPU</p><p class="mt-2 font-mono text-lg font-bold text-gray-900 dark:text-white">${metrics.process.cpuUsage.user}</p></div><div class="rounded-lg bg-orange-50 p-4 dark:bg-orange-900/20"><p class="text-xs font-semibold text-gray-600 dark:text-gray-400">SYSTEM CPU</p><p class="mt-2 font-mono text-lg font-bold text-gray-900 dark:text-white">${metrics.process.cpuUsage.system}</p></div></div></div><div class="rounded-lg border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-900"><div class="mb-6 flex items-center gap-2"><div class="h-8 w-1 rounded-full bg-red-500"></div><h2 class="text-xl font-bold text-gray-900 dark:text-white">System Information</h2></div><div class="grid gap-4 md:grid-cols-3"><div><p class="text-xs font-semibold text-gray-600 dark:text-gray-400">OS</p><p class="mt-2 font-semibold text-gray-900 dark:text-white">${metrics.system.type}</p><p class="text-xs text-gray-600 dark:text-gray-400">${metrics.system.platform}</p></div><div><p class="text-xs font-semibold text-gray-600 dark:text-gray-400">ARCHITECTURE</p><p class="mt-2 font-semibold text-gray-900 dark:text-white">${metrics.system.arch}</p></div><div><p class="text-xs font-semibold text-gray-600 dark:text-gray-400">KERNEL VERSION</p><p class="mt-2 font-mono text-sm font-semibold text-gray-900 dark:text-white">${metrics.system.release}</p></div></div></div><div class="rounded-lg border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-900"><div class="mb-6 flex items-center gap-2"><div class="h-8 w-1 rounded-full bg-cyan-500"></div><h2 class="text-xl font-bold text-gray-900 dark:text-white">Network Interfaces</h2></div><div class="space-y-4">${networkHtml}</div></div><div class="rounded-lg border border-gray-200 bg-white p-4 text-center text-xs text-gray-600 dark:border-gray-800 dark:bg-gray-900 dark:text-gray-400"><p>Metrics updated at ${dateStr}</p></div></div></main></body></html>`;
}

export function GET() {
  const metrics = getMetrics();
  const html = generateHTMLPage(metrics);

  return new NextResponse(html, {
    status: 200,
    headers: {
      "Cache-Control": "no-cache, no-store, must-revalidate",
      "Content-Type": "text/html; charset=utf-8",
    },
  });
}
