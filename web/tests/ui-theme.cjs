// Presentation regression checks. All API traffic is intercepted; no live data is changed.
// PLAYWRIGHT_MODULE points to playwright-core; BROWSER_EXE points to Chromium/Edge.
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright-core');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const output = path.resolve(__dirname, '../../docs/walkthrough');
const base = process.env.UI_TEST_URL || 'http://127.0.0.1:3000';
const branch = { id: 'branch-1', branch_name: 'Ahmedabad HQ', city: 'Ahmedabad', is_head_office: true, is_active: true };
const user = { id: 'user-1', first_name: 'Alex', last_name: 'Shah', email: 'alex@example.invalid', role_code: 'ROLE_SUPER_ADMIN', role_name: 'Administrator', primary_branch_id: branch.id, permissions: [] };
const statuses = [ { id: 'status-1', status_name: 'In progress', status_category: 'IN_PROGRESS', color_hex: '#3659df' }, { id: 'status-2', status_name: 'Done', status_category: 'DONE', color_hex: '#16a085' } ];
const tasks = [ { id: 'task-1', title: 'Prepare the customer portal release', task_code: 'PORTAL-104', priority: 'HIGH', status_id: 'status-1', status_name: 'In progress', status_category: 'IN_PROGRESS', status_color: '#3659df', task_type_name: 'Development', estimated_hours: 12, assignees: [], created_at: '2026-09-26', is_chargeable: true, charge_amount: 1200, currency: 'INR' } ];
const projects = [{ id: 'project-1', project_name: 'Customer portal', project_code: 'PORTAL', client_name: 'Acme', status: 'ACTIVE', budgeted_hours: 120, currency: 'INR', contract_amount: 40000 }];
const results = [];
(async () => {
  const browser = await chromium.launch({ executablePath: process.env.BROWSER_EXE, headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 1000 }, colorScheme: 'light' });
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  await context.route('**/api/v1/**', route => {
    const url = new URL(route.request().url());
    const endpoint = url.pathname.replace('/api/v1', '');
    let data = [];
    if (endpoint === '/auth/me') data = { user, permissions: [] };
    else if (endpoint === '/branches') data = [branch];
    else if (endpoint === '/tasks') data = { tasks };
    else if (endpoint === '/tasks/task-1') data = tasks[0];
    else if (endpoint === '/projects') data = projects;
    else if (endpoint === '/task-workflows/statuses') data = statuses;
    else if (endpoint === '/task-types') data = [{ id: 'type-1', type_name: 'Development', type_code: 'DEV' }];
    else if (endpoint === '/time-logs') data = { timeLogs: [], totalPages: 1 };
    else if (endpoint === '/notifications') data = { notifications: [], unreadCount: 0 };
    else if (endpoint === '/auth/preferences') data = { inApp: true, email: false, push: false };
    else if (endpoint === '/audit-logs') data = { auditLogs: [], totalPages: 1 };
    return route.fulfill({ json: { success: true, data, meta: { total_count: 1, total_pages: 1, page: 1, limit: 20 } } });
  });
  const record = (check) => results.push({ check, status: 'passed' });
  const theme = () => page.evaluate(() => ({ dark: document.documentElement.classList.contains('dark'), scheme: getComputedStyle(document.documentElement).colorScheme, background: getComputedStyle(document.body).backgroundColor }));
  try {
    await page.goto(base + '/login');
    const light = await theme();
    assert.equal(light.dark, false);
    await page.getByRole('button', { name: 'Switch to dark mode', exact: true }).click();
    const dark = await theme();
    assert.equal(dark.dark, true); assert.equal(dark.scheme, 'dark'); assert.notEqual(light.background, dark.background);
    await page.reload(); assert.equal((await theme()).dark, true);
    record('Login toggle changes computed colors and persists through reload against light OS preference');
    await page.evaluate(() => localStorage.setItem('ks_access_token', 'ui-fixture-token'));
    for (const appearance of ['light', 'dark']) {
      await page.evaluate(t => localStorage.setItem('ks_theme', t), appearance);
      await page.emulateMedia({ colorScheme: appearance === 'light' ? 'dark' : 'light' });
      for (const route of ['/dashboard', '/tasks', '/projects', '/clients', '/timesheets', '/admin', '/profile', '/notifications', '/releases', '/audit']) {
        await page.goto(base + route); await page.waitForLoadState('networkidle');
        assert.equal((await theme()).dark, appearance === 'dark');
        assert(await page.locator('main').isVisible());
        assert(await page.locator('main').innerText());
        if (route === '/dashboard' || route === '/admin') await page.screenshot({ path: path.join(output, `ui-${route.slice(1)}-${appearance}.png`), fullPage: true, animations: 'disabled' });
        if (route === '/admin') {
          await page.getByRole('button', { name: 'Add Branch', exact: true }).click();
          const dialog = page.getByRole('dialog'); await dialog.waitFor();
          const colors = await dialog.evaluate(el => ({ bg: getComputedStyle(el).backgroundColor, fg: getComputedStyle(el).color }));
          assert.notEqual(colors.bg, colors.fg);
          const value = Number(colors.bg.match(/\d+/)[0]);
          assert(appearance === 'dark' ? value < 60 : value > 220, `Dialog surface follows ${appearance}`);
          await page.keyboard.press('Shift+Tab');
          assert(await dialog.evaluate(el => el.contains(document.activeElement)), 'Dialog focus remains contained');
          await page.keyboard.press('Escape');
          await dialog.waitFor({ state: 'hidden' });
          assert.equal(await page.getByRole('button', { name: 'Add Branch', exact: true }).evaluate(el => el === document.activeElement), true);
          await page.getByRole('button', { name: 'Add Branch', exact: true }).click();
          await dialog.getByRole('button', { name: 'Cancel', exact: true }).click();
        }
      }
      record(`Ten authenticated routes and branch dialog render in ${appearance} mode against opposite OS preference`);
    }
    for (const width of [320, 390, 768]) {
      await page.setViewportSize({ width, height: 844 });
      for (const route of ['/dashboard', '/admin', '/tasks', '/timesheets']) {
        await page.goto(base + route); await page.waitForLoadState('networkidle');
        const overflow = await page.evaluate(() => document.documentElement.scrollWidth > innerWidth);
        assert.equal(overflow, false, `${route} document overflow at ${width}px`);
        const header = await page.locator('header').evaluate(el => el.scrollWidth <= el.clientWidth);
        assert(header, `Header overflow at ${width}px`);
        const search = await page.getByRole('button', { name: 'Search tasks and projects', exact: true }).boundingBox();
        const branchControl = await page.getByRole('combobox', { name: 'Active branch', exact: true }).boundingBox();
        assert(search.x + search.width <= branchControl.x, `Header controls overlap at ${width}px`);
      }
      await page.getByRole('button', { name: 'Toggle menu', exact: true }).click();
      await page.getByRole('link', { name: 'Overview', exact: true }).click();
      assert.equal(new URL(page.url()).pathname, '/dashboard');
      await page.waitForFunction(() => document.querySelector('aside').getBoundingClientRect().right <= 1);
      await page.screenshot({ path: path.join(output, `ui-mobile-${width}.png`), fullPage: true, animations: 'disabled' });
      record(`Responsive shell, route overflow and mobile navigation at ${width}px`);
    }
    await page.setViewportSize({ width: 1440, height: 1000 });
    await page.getByRole('button', { name: 'Collapse sidebar', exact: true }).click();
    await page.waitForFunction(() => document.querySelector('aside').getBoundingClientRect().width <= 81);
    const expand = await page.getByRole('button', { name: 'Expand sidebar', exact: true }).boundingBox();
    assert(expand.x + expand.width <= 80, 'Collapse control fits sidebar');
    await page.getByRole('button', { name: 'Expand sidebar', exact: true }).click();
    record('Desktop sidebar collapses and expands without clipping its control');
    const other = await context.newPage();
    await other.goto(base + '/login');
    await other.evaluate(() => localStorage.setItem('ks_theme', 'light'));
    await page.waitForFunction(() => !document.documentElement.classList.contains('dark'));
    record('Theme changes synchronize between tabs');
    await other.close();
    await page.evaluate(() => localStorage.setItem('ks_theme', 'invalid'));
    await page.emulateMedia({ colorScheme: 'dark' });
    await page.reload();
    assert.equal((await theme()).dark, true);
    record('Invalid stored theme falls back to OS preference');
    assert.deepEqual(errors, []); record('No uncaught browser exceptions');
  } catch (e) {
    results.push({ check: 'UI regression', status: 'failed', message: e.message, url: page.url(), errors });
    await page.screenshot({ path: path.join(output, 'ui-review-failure.png'), fullPage: true, animations: 'disabled' });
    process.exitCode = 1;
  } finally {
    fs.writeFileSync(path.join(output, 'ui-theme-results.json'), JSON.stringify(results, null, 2));
    console.log(JSON.stringify(results, null, 2));
    await browser.close();
  }
})();
