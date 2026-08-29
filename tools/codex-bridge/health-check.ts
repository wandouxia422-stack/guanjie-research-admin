import 'dotenv/config';

const apiBase = process.env.GUANJIE_API_BASE?.replace(/\/$/, '');
const token = process.env.GUANJIE_BRIDGE_TOKEN;
const bridgeId = process.env.GUANJIE_BRIDGE_ID;
if (!apiBase || !token || !bridgeId) throw new Error('Bridge environment is incomplete');

const response = await fetch(`${apiBase}/api/research-admin/bridge/heartbeat`, {
  method: 'POST', headers: { 'content-type': 'application/json', authorization: `Bearer ${token}` },
  body: JSON.stringify({ bridgeId, projectRoot: process.env.GUANJIE_PROJECT_ROOT }),
});
if (!response.ok) throw new Error(`Health check failed: ${response.status} ${await response.text()}`);
process.stdout.write(`Bridge API reachable: ${await response.text()}\n`);
