// All API calls use fixtures; this check never touches a database.
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright-core');
const assert = require('node:assert/strict');
const base = process.env.UI_TEST_URL || 'http://localhost:3000';
const screens = [
  ['/projects', 'Projects', 'Add Project'],
  ['/products', 'Products', 'Add Product'],
  ['/versions', 'Versions', 'Add Version'],
  ['/clients', 'Clients', 'Add Client'],
  ['/admin/branches', 'Branches', 'Add Branch'],
  ['/admin/departments', 'Departments', 'Add Department'],
  ['/admin/designations', 'Designations', 'Add Designation'],
  ['/admin/employees', 'Employees', 'Add Employee'],
  ['/admin/task-types', 'Task types', 'Add Task type'],
  ['/admin/statuses', 'Statuses', 'Add Workflow status'],
  ['/admin/roles', 'Roles', 'Add Role'],
  ['/admin/assignment-rules', 'Assignment rules', 'Add Assignment rule'],
  ['/admin/transitions', 'Transitions', 'Add transition'],
  ['/admin/permissions', 'Permissions'],
];

(async () => {
  const browser = await chromium.launch({ executablePath: process.env.BROWSER_EXE, headless: true });
  try {
    const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
    await context.addInitScript(() => localStorage.setItem('ks_access_token', 'navigation-fixture'));
    let authenticated = true;
    await context.route('**/api/v1/**', route => {
      const endpoint = new URL(route.request().url()).pathname.replace('/api/v1', '');
      assert.equal(route.request().method(), 'GET', 'Navigation and opening forms must not write data');
      if (!authenticated) return route.fulfill({ status: 401, json: { message: 'Unauthorized' } });
      let data = [];
      if (endpoint === '/auth/me') data = { user: { id: 'admin', first_name: 'Test', last_name: 'Admin', role_code: 'ROLE_SUPER_ADMIN' }, permissions: [] };
      if (endpoint === '/notifications') data = { notifications: [], unreadCount: 0 };
      return route.fulfill({ json: { success: true, data, meta: { page: 1, total_pages: 1, total_count: 0 } } });
    });
    const page = await context.newPage();
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    const nav = page.getByRole('navigation', { name: 'Main navigation' });
    for (const [path, title, add] of screens) {
      await page.goto(base + path);
      await page.waitForLoadState('networkidle');
      assert.equal(new URL(page.url()).pathname, path);
      assert.equal(await nav.getByRole('link', { name: title, exact: true }).getAttribute('aria-current'), 'page');
      if (path !== '/clients') assert(await page.getByRole('heading', { name: title, exact: true, level: 1 }).isVisible());
      if (title !== 'Permissions') assert.equal(await page.getByRole('tablist').count(), 0);
      if (add) {
        await page.getByRole('button', { name: add, exact: true }).click();
        assert(await page.getByRole('button', { name: 'Save', exact: true }).isVisible());
      }
      await page.reload();
      await page.waitForLoadState('networkidle');
      assert.equal(new URL(page.url()).pathname, path);
      if (add) assert(await page.getByRole('button', { name: add, exact: true }).isVisible());
    }
    await page.goto(base + '/projects');
    await nav.getByRole('link', { name: 'Products', exact: true }).click();
    await page.waitForURL('**/products');
    await nav.getByRole('link', { name: 'Versions', exact: true }).click();
    await page.waitForURL('**/versions');
    await page.goBack();
    await page.waitForURL('**/products');
    await page.getByRole('heading', { name: 'Products', exact: true, level: 1 }).waitFor();
    await page.goForward();
    await page.waitForURL('**/versions');
    await page.goto(base + '/admin');
    await page.waitForURL('**/admin/branches');
    // Navigating away from an open master form must clear that form.
    await page.getByRole('button', { name: 'Add Branch', exact: true }).click();
    await page.goBack();
    await page.waitForURL('**/versions');
    assert.equal(await page.getByRole('dialog').count(), 0);
    await page.setViewportSize({ width: 390, height: 844 });
    await page.getByRole('button', { name: 'Toggle menu', exact: true }).click();
    await nav.getByRole('link', { name: 'Permissions', exact: true }).click();
    await page.waitForURL('**/admin/permissions');
    await page.getByRole('heading', { name: 'Permissions', exact: true, level: 1 }).waitFor();
    const sidebar = page.getByRole('complementary', { name: 'Workspace sidebar' });
    await page.waitForTimeout(350);
    assert((await sidebar.boundingBox()).x < 0, 'Mobile menu closes after navigation');
    assert(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth), 'No mobile horizontal overflow');
    // Direct master URLs still require authentication.
    authenticated = false;
    await page.evaluate(() => localStorage.clear());
    await page.goto(base + '/admin/roles');
    await page.waitForURL('**/login');
    assert.deepEqual(errors, []);
    console.log('Passed: 14 direct URLs, menus, forms, reloads, history, legacy redirect, form reset, mobile navigation, and authentication. All API calls mocked.');
  } finally {
    await browser.close();
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
