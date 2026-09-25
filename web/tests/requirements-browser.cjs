// Run with PLAYWRIGHT_MODULE, TEST_EMAIL and TEST_PASSWORD environment variables.
// Creates visibly prefixed QA records through the UI; never executes database scripts.
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright-core');
const fs = require('fs');
const path = require('path');
const assert = require('node:assert/strict');
const results = [];
const stamp = `QA-${Date.now().toString().slice(-8)}`;
const output = path.resolve(__dirname, '../../docs/walkthrough/requirements-browser-results.json');
async function main() {
  const browser = await chromium.launch({ executablePath: process.env.BROWSER_EXE, headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
  const errors = []; page.on('pageerror', e => errors.push(e.message));
  page.on('dialog', d => d.accept());
  try {
    await page.goto('http://127.0.0.1:3000/login');
    await page.locator('input[type=email]').fill(process.env.TEST_EMAIL);
    await page.locator('input[type=password]').fill(process.env.TEST_PASSWORD);
    await page.locator('button[type=submit]').click();
    await page.waitForURL('**/dashboard');
    results.push({ check: 'Browser administrator login', status: 'passed' });
    const request = async (url, method = 'GET', data) => {
      const token = await page.evaluate(() => localStorage.getItem('ks_access_token'));
      const response = await page.request.fetch(`http://127.0.0.1:3000/api/v1${url}`, { method, data, headers: { Authorization: `Bearer ${token}` } });
      const body = await response.json();
      assert(response.ok(), `${method} ${url}: ${response.status()} ${JSON.stringify(body.message)}`);
      return body.data;
    };
    const choose = (value) => ({ select: value });
    async function form(route, tab, button, values, expectedPath) {
      await page.goto(`http://127.0.0.1:3000${route}`);
      if (tab) await page.getByRole('tab', { name: tab, exact: true }).click();
      await page.getByRole('button', { name: button, exact: true }).click();
      const dialog = page.getByRole('dialog');
      for (const [label, value] of Object.entries(values)) {
        const field = dialog.getByLabel(label, { exact: true });
        if (value && typeof value === 'object') await field.selectOption(value.select);
        else await field.fill(String(value));
      }
      const pending = page.waitForResponse(r => r.url().endsWith(`/api/v1${expectedPath}`) && r.request().method() === 'POST');
      await dialog.getByRole('button', { name: 'Save', exact: true }).click();
      const response = await pending;
      const body = await response.json();
      assert(response.ok(), `${tab || route} UI save failed: ${response.status()} ${JSON.stringify(body.message)}`);
      await dialog.waitFor({ state: 'hidden' });
      results.push({ check: `${tab || route}: create through rendered form`, status: 'passed', id: body.data.id });
      return body.data;
    }
    const branch = await form('/admin', 'Branches', 'Add Branch', { 'Branch code': stamp, 'Branch name': `${stamp} Test Branch`, 'Address line 1': 'QA Test Address', City: 'Ahmedabad', State: 'Gujarat', 'Postal code': '380001', 'Official email': `${stamp.toLowerCase()}@example.invalid`, Latitude: '0', Longitude: '0' }, '/branches');
    assert.equal(Number(branch.latitude), 0);
    const department = await form('/admin', 'Departments', 'Add Department', { 'Department code': stamp, 'Department name': `${stamp} Test Department`, Description: 'Automated UI test' }, '/departments');
    const designation = await form('/admin', 'Designations', 'Add Designation', { 'Designation code': stamp, 'Designation name': `${stamp} Test Designation`, Department: choose(department.id), 'Hierarchy level': '3' }, '/designations');
    const role = await form('/admin', 'Roles', 'Add Role', { 'Role code': stamp, 'Role name': `${stamp} Test Role`, Description: 'Test role without permissions' }, '/rbac/roles');
    const employee = await form('/admin', 'Employees', 'Add Employee', { 'Employee code': stamp, 'First name': stamp, 'Last name': 'Test Employee', 'Official email': `${stamp.toLowerCase()}-employee@example.invalid`, 'Mobile number': `+918${Date.now().toString().slice(-9)}`, 'Password (leave blank to retain when editing)': 'QaTestOnly@2026', 'Primary branch': choose(branch.id), Department: choose(department.id), Designation: choose(designation.id), Role: choose(role.id) }, '/users');
    const client = await form('/clients', null, 'Add Client', { 'Client code': stamp, 'Company name': `${stamp} Test Client`, 'Contact person': 'QA Contact', Email: `${stamp.toLowerCase()}-client@example.invalid`, Phone: '+919000000000', City: 'Ahmedabad', State: 'Gujarat', Branch: choose(branch.id) }, '/clients');
    const product = await form('/projects', 'Products', 'Add Product', { 'Product code': stamp, 'Product name': `${stamp} Test Product`, Category: 'QA', 'Production version': '1.0', 'AMC percentage': '0' }, '/products');
    assert.equal(Number(product.standard_amc_percentage), 0);
    const me = (await request('/auth/me')).user;
    const project = await form('/projects', 'Projects', 'Add Project', { 'Project code': stamp, 'Project name': `${stamp} Test Project`, Client: choose(client.id), Branch: choose(branch.id), 'Project manager': choose(me.id), 'Contract value': '1000', 'Budgeted hours': '10', Currency: 'INR', 'Planned start': '2026-09-25', 'Planned end': '2026-10-25' }, '/projects');
    const version = await form('/projects', 'Versions', 'Add Version', { 'Version number': stamp, 'Version name': `${stamp} Release`, 'Applies to': choose('PROJECT'), Project: choose(project.id), 'Target release': '2026-10-25' }, '/versions');
    const type = await form('/admin', 'Task types', 'Add Task type', { 'Type code': stamp, 'Type name': `${stamp} Test Type` }, '/task-types');
    const done = await form('/admin', 'Statuses', 'Add Workflow status', { 'Status code': stamp, 'Status name': `${stamp} Done`, Category: choose('DONE'), Sequence: '100' }, '/task-workflows/statuses');
    const task = await form('/tasks', null, 'New Task', { Title: `${stamp} Test Task`, 'Task type': choose(type.id), Project: choose(project.id), Version: choose(version.id), Branch: choose(branch.id), Assignees: choose([employee.id]), 'Primary assignee': choose(employee.id), 'Estimated hours': '2', 'Planned start': '2026-09-25', 'Planned end': '2026-10-25' }, '/tasks');
    for (const route of ['/dashboard', '/tasks', '/projects', '/clients', '/timesheets', '/admin', '/audit', '/releases']) { await page.goto(`http://127.0.0.1:3000${route}`); await page.waitForLoadState('networkidle'); assert((await page.locator('body').innerText()).length > 100); results.push({ check: `${route}: rendered screen`, status: 'passed' }); }
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('http://127.0.0.1:3000/admin');
    await page.screenshot({ path: path.resolve(__dirname, '../../docs/walkthrough/requirements-mobile-width.png'), fullPage: true });
    assert.deepEqual(errors, []);
    results.push({ check: 'No uncaught browser exceptions', status: 'passed' });
    results.push({ check: 'Created test dataset', stamp, branch: branch.id, department: department.id, designation: designation.id, role: role.id, employee: employee.id, client: client.id, product: product.id, project: project.id, version: version.id, type: type.id, done: done.id, task: task.id });
  } catch (e) { results.push({ check: 'Browser test failure', status: 'failed', message: e.message }); await page.screenshot({ path: path.resolve(__dirname, '../../docs/walkthrough/requirements-browser-failure.png'), fullPage: true }); process.exitCode = 1; }
  finally { fs.writeFileSync(output, JSON.stringify(results, null, 2)); console.log(JSON.stringify(results, null, 2)); await browser.close(); }
}
main().catch(e => { console.error(e.message); process.exitCode = 1; });
