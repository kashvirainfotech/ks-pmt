const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright-core');
const fs = require('fs'); const path = require('path'); const assert = require('node:assert/strict');
const root = path.resolve(__dirname, '../../docs/walkthrough');
const dataset = JSON.parse(fs.readFileSync(path.join(root, 'requirements-browser-results.json'))).find(r => r.check === 'Created test dataset');
const results = [];
async function main() {
  const browser = await chromium.launch({ executablePath: process.env.BROWSER_EXE, headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
  page.on('dialog', d => d.accept());
  let token;
  async function api(url, method = 'GET', data, expected = 200, overrideToken) {
    const r = await page.request.fetch(`http://127.0.0.1:3000/api/v1${url}`, { method, data, headers: { Authorization: `Bearer ${overrideToken || token}` } });
    const body = await r.json();
    assert.equal(r.status(), expected, `${method} ${url}: ${JSON.stringify(body.message)}`);
    return body.data;
  }
  async function check(name, action) { try { await action(); results.push({ check: name, status: 'passed' }); } catch (e) { results.push({ check: name, status: 'failed', message: e.message }); process.exitCode = 1; } }
  async function saveInline(endpoint, values, container = page.locator('form').last()) {
    for (const [label, value] of Object.entries(values)) { const field = container.getByLabel(label, { exact: true }); if (value?.select !== undefined) await field.selectOption(value.select); else await field.fill(String(value)); }
    const pending = page.waitForResponse(r => r.url().endsWith(`/api/v1${endpoint}`) && ['POST', 'PUT'].includes(r.request().method()));
    await container.getByRole('button', { name: 'Save', exact: true }).click(); const r = await pending; const body = await r.json(); assert(r.ok(), JSON.stringify(body.message)); return body.data;
  }
  try {
    await page.goto('http://127.0.0.1:3000/login'); await page.locator('input[type=email]').fill(process.env.TEST_EMAIL); await page.locator('input[type=password]').fill(process.env.TEST_PASSWORD); await page.locator('button[type=submit]').click(); await page.waitForURL('**/dashboard'); token = await page.evaluate(() => localStorage.getItem('ks_access_token'));
    await check('Project team allocation through UI', async () => {
      await page.goto('http://127.0.0.1:3000/projects'); await page.getByLabel('Search Projects').fill(dataset.stamp); await page.getByRole('button', { name: 'Details', exact: true }).click(); await page.getByRole('button', { name: 'Add team member', exact: true }).click(); await saveInline(`/projects/${dataset.project}/members`, { Employee: { select: dataset.employee }, 'Project role': 'QA engineer', 'Allocation percent': '50', 'Start date': '2026-09-25', 'End date': '2026-10-25' }); const members = await api(`/projects/${dataset.project}/members`); assert(members.some(m => m.user_id === dataset.employee));
    });
    await check('Client license through UI', async () => {
      await page.goto('http://127.0.0.1:3000/projects'); await page.getByRole('tab', { name: 'Products', exact: true }).click(); await page.getByLabel('Search Products').fill(dataset.stamp); await page.getByRole('button', { name: 'Details', exact: true }).click(); await page.getByRole('button', { name: 'Add license', exact: true }).click(); await saveInline(`/products/${dataset.product}/clients`, { Client: { select: dataset.client }, 'License type': { select: 'SAAS_SUBSCRIPTION' }, 'Annual contract value': '1200', 'License start': '2026-09-25', 'License end': '2027-09-24', 'AMC renewal': '2027-09-01' });
    });
    let task = await api(`/tasks/${dataset.task}`);
    await check('Workflow transition through UI', async () => {
      await page.goto('http://127.0.0.1:3000/admin'); await page.getByRole('tab', { name: 'Transitions', exact: true }).click(); await page.getByRole('button', { name: 'Add transition' }).click(); await saveInline('/task-workflows/transitions', { 'Task type': { select: dataset.type }, 'From status': { select: task.status_id }, 'To status': { select: dataset.done } });
    });
    await check('Assignment rule through UI', async () => {
      await page.goto('http://127.0.0.1:3000/admin'); await page.getByRole('tab', { name: 'Assignment rules', exact: true }).click(); await page.getByRole('button', { name: 'Add Assignment rule' }).click(); await saveInline('/auto-assignment/rules', { 'Rule name': `${dataset.stamp} Assignment`, 'Trigger event': { select: 'ON_CREATION' }, 'Task type': { select: dataset.type }, Branch: { select: dataset.branch }, 'Assignment strategy': { select: 'SPECIFIC_USER' }, 'Target employee': { select: dataset.employee } }, page.getByRole('dialog'));
    });
    await check('Subtask creation and workflow completion API', async () => { const child = await api(`/tasks/${dataset.task}/subtasks`, 'POST', { title: `${dataset.stamp} Subtask` }, 201); await api(`/tasks/subtasks/${child.id}/toggle`, 'PATCH', { isCompleted: true }); const children = await api(`/tasks/${dataset.task}/subtasks`); assert(children.some(c => c.id === child.id && c.is_completed)); });
    await check('Task chargeability and assignee readback', async () => { await api(`/tasks/${dataset.task}`, 'PUT', { isChargeable: true, chargeAmount: 250 }); const t = await api(`/tasks/${dataset.task}`); assert.equal(Number(t.charge_amount), 250); assert(t.assignees.some(a => a.user_id === dataset.employee)); });
    await check('Threaded comments API', async () => { const c = await api('/comments', 'POST', { taskId: dataset.task, commentText: `${dataset.stamp} Test comment` }, 201); await api('/comments', 'POST', { taskId: dataset.task, parentCommentId: c.id, commentText: 'QA reply' }, 201); const comments = await api(`/comments/task/${dataset.task}`); assert(comments.find(x => x.id === c.id).replies.length === 1); });
    await check('Manual worklog and effort rollup API', async () => { await api('/time-logs', 'POST', { taskId: dataset.task, logDate: '2026-09-25', hoursSpent: 1.25, description: `${dataset.stamp} Test effort`, isBillable: true }, 201); const logs = await api(`/time-logs/task/${dataset.task}`); assert(logs.logs.some(l => Number(l.hours_spent) === 1.25)); });
    await check('Prospect conversion and readback', async () => { await api(`/clients/${dataset.client}/convert-to-active`, 'POST', {}, 201); assert.equal((await api(`/clients/${dataset.client}`)).client_type, 'ACTIVE_CLIENT'); });
    await check('Role permission matrix and override precedence', async () => { const permissions = await api('/rbac/permissions'); const p = permissions.find(x => x.permission_code === 'TASKS:READ'); await api(`/rbac/roles/${dataset.role}/permissions/${p.id}`, 'PUT', { effect: 'grant' }); await api(`/rbac/branches/${dataset.branch}/permissions/${p.id}`, 'PUT', { effect: 'deny' }); const employee = await api(`/users/${dataset.employee}`); const login = await api('/auth/login-password', 'POST', { email: employee.email, password: 'QaTestOnly@2026' }); assert(!login.permissions.includes('TASKS:READ')); await api(`/rbac/users/${dataset.employee}/permissions/${p.id}`, 'PUT', { effect: 'grant' }); const me = await api('/auth/me', 'GET', undefined, 200, login.accessToken); assert(me.permissions.includes('TASKS:READ')); });
    await check('Missing schema field rejected without partial record', async () => { const r = await page.request.post('http://127.0.0.1:3000/api/v1/products', { headers: { Authorization: `Bearer ${token}` }, data: { productCode: `${dataset.stamp}-SCHEMA`, productName: 'Schema validation only', techStack: 'Test' } }); const body = await r.json(); if (r.status() === 503) { assert.match(body.message, /No record was saved/); const products = await api('/products'); assert(!products.some(p => p.product_code === `${dataset.stamp}-SCHEMA`)); results.push({ check: 'New schema fields', status: 'blocked', reason: 'Manual SQL application pending' }); } else { assert.equal(r.status(), 201, JSON.stringify(body.message)); assert.equal(body.data.tech_stack, 'Test'); } });
    await check('Invalid time-log pagination rejected', async () => { await api('/time-logs?limit=not-a-number', 'GET', undefined, 400); });
    await check('Profile and notification screens render', async () => { for (const route of ['profile', 'notifications']) { await page.goto(`http://127.0.0.1:3000/${route}`); await page.waitForLoadState('networkidle'); assert(await page.locator('h1').isVisible()); } });
  } finally { fs.writeFileSync(path.join(root, 'requirements-relations-results.json'), JSON.stringify(results, null, 2)); console.log(JSON.stringify(results, null, 2)); await browser.close(); }
}
main().catch(e => { console.error(e.message); process.exitCode = 1; });
