const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright-core');
const fs = require('fs'); const path = require('path'); const assert = require('node:assert/strict');
const root = path.resolve(__dirname, '../../docs/walkthrough');
const dataset = JSON.parse(fs.readFileSync(path.join(root, 'requirements-browser-results.json'))).find(r => r.check === 'Created test dataset');
const results = [];
async function main() {
  const browser = await chromium.launch({ executablePath: process.env.BROWSER_EXE, headless: true });
  const page = await browser.newPage(); let token;
  async function api(url, method = 'GET', data, expected = 200, bearer = token, headers = {}) {
    const r = await page.request.fetch(`http://127.0.0.1:3000/api/v1${url}`, { method, data, headers: { Authorization: `Bearer ${bearer}`, ...headers } });
    const b = await r.json(); assert.equal(r.status(), expected, `${method} ${url}: ${JSON.stringify(b.message)}`); return b.data;
  }
  async function check(name, fn) { try { await fn(); results.push({ check: name, status: 'passed' }); } catch (e) { results.push({ check: name, status: 'failed', message: e.message }); process.exitCode = 1; } }
  try {
    await page.goto('http://127.0.0.1:3000/login'); await page.locator('input[type=email]').fill(process.env.TEST_EMAIL); await page.locator('input[type=password]').fill(process.env.TEST_PASSWORD); await page.locator('button[type=submit]').click(); await page.waitForURL('**/dashboard'); token = await page.evaluate(() => localStorage.getItem('ks_access_token'));
    await check('Timesheet entry through browser form', async () => {
      await page.goto('http://127.0.0.1:3000/timesheets'); await page.getByRole('button', { name: 'Log work', exact: true }).click();
      await page.getByLabel('Task', { exact: true }).selectOption(dataset.task); await page.getByLabel('Hours spent', { exact: true }).fill('0.25'); await page.getByLabel('Work summary', { exact: true }).fill(`${dataset.stamp} Browser worklog`); await page.getByLabel('Overtime', { exact: true }).check();
      const pending = page.waitForResponse(r => r.url().endsWith('/api/v1/time-logs') && r.request().method() === 'POST'); await page.getByRole('button', { name: 'Save', exact: true }).click(); const r = await pending; assert.equal(r.status(), 201); const b = await r.json(); assert.equal(b.data.is_overtime, true);
    });
    const employee = await api(`/users/${dataset.employee}`);
    const auth = await api('/auth/login-password', 'POST', { email: employee.email, password: 'QaTestOnly@2026' });
    await check('Branch scope rejects foreign header and task', async () => {
      const tasks = await api('/tasks?limit=100'); const foreign = tasks.find(t => t.branch_id && t.branch_id !== dataset.branch); assert(foreign, 'Need an existing task from another test branch');
      await api('/tasks', 'GET', undefined, 403, auth.accessToken, { 'x-branch-id': foreign.branch_id }); await api(`/tasks/${foreign.id}`, 'GET', undefined, 403, auth.accessToken);
    });
    await check('Task financial data hidden without financial permission', async () => { const task = await api(`/tasks/${dataset.task}`, 'GET', undefined, 200, auth.accessToken); assert(!('charge_amount' in task)); });
    await check('Test employee preferences saved through browser form', async () => {
      await page.evaluate(a => { localStorage.removeItem('ks_selected_branch_id'); localStorage.setItem('ks_access_token', a.accessToken); localStorage.setItem('ks_refresh_token', a.refreshToken); }, auth);
      await page.goto('http://127.0.0.1:3000/profile'); await page.getByLabel('Email alerts', { exact: true }).uncheck();
      const pending = page.waitForResponse(r => r.url().endsWith('/api/v1/auth/preferences') && r.request().method() === 'PUT'); await page.locator('section').filter({ has: page.getByRole('heading', { name: 'Notification channels' }) }).getByRole('button', { name: 'Save', exact: true }).click(); assert.equal((await pending).status(), 200);
    });
    await check('S3 attachment upload, confirmation and download', async () => {
      const bytes = Buffer.from(`${dataset.stamp} attachment verification\n`);
      const upload = await api('/attachments/presigned-upload-url', 'POST', { entityType: 'TASK', entityId: dataset.task, fileName: `${dataset.stamp}.txt`, mimeType: 'text/plain', fileSizeBytes: bytes.length }, 201);
      const put = await page.request.put(upload.uploadUrl, { data: bytes, headers: { 'Content-Type': 'text/plain' } });
      if (!put.ok()) { const text = await put.text(); throw new Error(`S3 upload returned ${put.status()}: ${text.match(/<Code>([^<]+)/)?.[1] || 'provider error'}`); }
      await api('/attachments/confirm-upload', 'POST', { attachmentId: upload.attachmentId }, 201);
      const download = await api(`/attachments/${upload.attachmentId}/presigned-download-url`); const file = await page.request.get(download.downloadUrl); assert(file.ok()); assert.equal(await file.text(), bytes.toString());
    });
  } finally { fs.writeFileSync(path.join(root, 'requirements-final-results.json'), JSON.stringify(results, null, 2)); console.log(JSON.stringify(results, null, 2)); await browser.close(); }
}
main().catch(e => { console.error(e.message); process.exitCode = 1; });
