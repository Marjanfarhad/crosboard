#!/usr/bin/env node
// Quick benchmark script for the /__manus__/logs endpoint.
// Usage:
//   node scripts/bench-manus-logs.js --url http://localhost:3000/__manus__/logs --concurrency 50 --requests 500 --payloadSize 512

const args = process.argv.slice(2);
function getArg(name, fallback) {
  const idx = args.findIndex(a => a === name);
  if (idx === -1) return fallback;
  return args[idx+1];
}

const url = getArg('--url', 'http://localhost:3000/__manus__/logs');
const concurrency = Number(getArg('--concurrency', 20));
const totalRequests = Number(getArg('--requests', 200));
const payloadSize = Number(getArg('--payloadSize', 256));

if (!url) {
  console.error('Missing --url');
  process.exit(1);
}

function makePayload(size) {
  const filler = 'x'.repeat(Math.max(0, size));
  // small array of objects; each object includes a message of approximate size
  const item = { msg: filler };
  return JSON.stringify({ consoleLogs: new Array(3).fill(item) });
}

const payload = makePayload(payloadSize);

async function worker(id, jobs, results) {
  while (true) {
    const n = jobs.shift();
    if (n === undefined) return;
    const start = Date.now();
    try {
      const res = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: payload });
      const ms = Date.now() - start;
      const status = res.status;
      results.push({ ms, status });
    } catch (e) {
      const ms = Date.now() - start;
      results.push({ ms, status: 0, error: String(e) });
    }
  }
}

async function run() {
  console.log(`Benchmarking ${url}`);
  console.log(`Concurrency: ${concurrency}, Total: ${totalRequests}, Payload size (approx): ${payloadSize} bytes`);

  const jobs = Array.from({ length: totalRequests }, (_, i) => i);
  const results = [];

  const startAll = Date.now();
  const workers = [];
  for (let i = 0; i < concurrency; i++) {
    workers.push(worker(i, jobs, results));
  }

  await Promise.all(workers);
  const duration = (Date.now() - startAll) / 1000;

  const successes = results.filter(r => r.status === 200).length;
  const payloadTooLarge = results.filter(r => r.status === 413).length;
  const errors = results.filter(r => r.status === 0 || (r.status !== 200 && r.status !== 413)).length;

  const latencies = results.filter(r => r.ms != null).map(r => r.ms).sort((a,b)=>a-b);
  const total = results.length;
  const mean = latencies.reduce((a,b)=>a+b,0)/Math.max(1,latencies.length);
  const p = (p)=>{ if (latencies.length===0) return 0; const idx = Math.floor((p/100)*latencies.length); return latencies[Math.min(latencies.length-1, Math.max(0, idx))]; };

  console.log('--- Results ---');
  console.log(`Total requests attempted: ${totalRequests}`);
  console.log(`Completed responses: ${total}`);
  console.log(`Success (200): ${successes}`);
  console.log(`Payload too large (413): ${payloadTooLarge}`);
  console.log(`Other errors: ${errors}`);
  console.log(`Duration: ${duration.toFixed(2)}s`);
  console.log(`Throughput: ${(total/duration).toFixed(1)} req/s`);
  console.log(`Latency mean: ${mean.toFixed(1)} ms`);
  console.log(`p50: ${p(50)} ms, p95: ${p(95)} ms, p99: ${p(99)} ms, max: ${latencies[latencies.length-1] ?? 0} ms`);
  process.exit(0);
}

run().catch(e=>{ console.error(e); process.exit(2); });
