// Fixture-only browser acceptance. All API requests are intercepted; no database writes.
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright-core');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const base = process.env.UI_TEST_URL || 'http://127.0.0.1:3000';
const checks = [];
(async () => {
  const browser = await chromium.launch({ executablePath: process.env.BROWSER_EXE, headless: true });
  try {
    const context = await browser.newContext({ viewport: {width:1440,height:1000} });
    await context.addInitScript(() => { localStorage.setItem('ks_access_token','fixture'); localStorage.setItem('ks_selected_branch_id','b1'); });
    let readonly = false, failNext = '', lastCreate, lastPatch, assignments;
    const devSchema={risk:{label:'Risk',type:'number'},verified:{label:'Verified',type:'boolean'}};
    const bugSchema={environment:{label:'Environment',type:'select',required:true,options:['Test','Production']}};
    let task = { id:'task1',task_code:'DEMO-1042',title:'Improve task editing',description:'Acceptance criteria\nKeep the whole description visible.',revision:1,custom_field_definitions:devSchema,custom_field_values:{},
      task_type_id:'t1',type_name:'Development',status_id:'s1',status_name:'Open',status_category:'TODO',branch_id:'b1',branch_name:'Head office',
      project_id:'p1',project_name:'Client portal',product_id:null,version_id:'v1',version_code:'v1.0',priority:'MEDIUM',severity:'Normal',
      planned_end_date:'2026-10-05T10:00:00Z',estimated_hours:4,is_chargeable:false,charge_amount:0,currency:'INR',assignees:[],created_at:'2026-09-27T10:00:00Z' };
    const users = [{id:'u1',first_name:'Asha',last_name:'Patel',is_active:true},{id:'u2',first_name:'Raj',last_name:'Shah',is_active:true}];
    await context.route('**/api/v1/**', async route => {
      const request = route.request(), url = new URL(request.url()), endpoint = url.pathname.replace('/api/v1','');
      let data = [], status = 200;
      if (request.method() !== 'GET') {
        const body = request.postDataJSON();
        if (endpoint === '/tasks' && request.method() === 'POST') { lastCreate = body; data={...task,id:'created',task_code:'DEMO-NEW'}; }
        else if (endpoint === '/tasks/task1' && request.method() === 'PATCH') {
          lastPatch = body;
          if (failNext === 'conflict') { failNext=''; task.revision++; task.title='Updated by teammate'; return route.fulfill({status:409,json:{message:'This task changed since you opened it. Reload the latest task.'}}); }
          if (failNext === 'validation') { failNext=''; return route.fulfill({status:400,json:{message:'Example field validation failure'}}); }
          if (body.expectedRevision !== task.revision) return route.fulfill({status:409,json:{message:'Task changed; reload the latest version.'}});
          for (const [key,value] of Object.entries(body)) if (key !== 'expectedRevision') task[key.replace(/[A-Z]/g,c=>'_'+c.toLowerCase())]=value;
          if(body.taskTypeId) { task.custom_field_definitions=body.taskTypeId==='t2'?bugSchema:devSchema; task.type_name=body.taskTypeId==='t2'?'Bug':'Development'; }
          task.revision++; data={...task};
        } else if (endpoint.endsWith('/assignees')) {
          assert.equal(body.expectedRevision,task.revision); assignments=body;
          task.assignees=body.assigneeIds.map(id=>({user_id:id,full_name:users.find(u=>u.id===id).first_name+' '+users.find(u=>u.id===id).last_name,is_primary_assignee:id===body.primaryAssigneeId}));
          task.revision++; data={...task};
        } else if (endpoint.endsWith('/status')) { task.status_id=body.toStatusId; task.status_name='In progress'; task.revision++; data={...task}; }
        return route.fulfill({status,json:{success:true,data}});
      }
      if (endpoint === '/auth/me') data={id:'u1',first_name:'Asha',last_name:'Patel',role_code:readonly?'ROLE_READER':'ROLE_SUPER_ADMIN',permissions:readonly?['TASKS:READ']:[],primary_branch_id:'b1'};
      else if (endpoint === '/branches') data=[{id:'b1',branch_name:'Head office',is_active:true}];
      else if (endpoint === '/projects') data=[{id:'p1',project_name:'Client portal',branch_id:'b1',is_active:true}];
      else if (endpoint === '/products') data=[{id:'prod1',product_name:'ERP',is_active:true}];
      else if (endpoint === '/versions') data=[{id:'v1',version_code:'v1.0',project_id:'p1',product_id:null,is_active:true},{id:'v2',version_code:'Other release',project_id:'p2',is_active:true}];
      else if (endpoint === '/users') data=users;
      else if (endpoint === '/task-types') data=[{id:'t1',type_name:'Development',custom_fields:devSchema,is_active:true},{id:'t2',type_name:'Bug',custom_fields:bugSchema,default_severity:'Major',is_chargeable_default:true,is_active:true}];
      else if (endpoint === '/task-workflows/statuses') data=[{id:'s1',status_name:'Open',status_category:'TODO'},{id:'s2',status_name:'In progress',status_category:'IN_PROGRESS'}];
      else if (endpoint.includes('allowed-next-statuses')) data=[{id:'s2',status_name:'In progress',status_category:'IN_PROGRESS'}];
      else if (endpoint === '/tasks') data=[task];
      else if (endpoint === '/tasks/task1') data=task;
      else if (endpoint === '/tasks/task1/history') data=[{id:'audit1',actor_name:'Asha Patel',action_type:'TASK_UPDATED',created_at:'2026-09-28T04:00:00Z',old_values:{priority:'MEDIUM'},new_values:{priority:'HIGH'}}];
      else if (endpoint === '/notifications/unread-count') data={count:0};
      return route.fulfill({json:{success:true,data,meta:{page:1,limit:100,total_count:Array.isArray(data)?data.length:1,total_pages:1}}});
    });
    const page = await context.newPage();
    const errors=[]; page.on('pageerror',e=>errors.push(e.message)); page.on('dialog',d=>d.accept());
    await page.goto(base+'/tasks');
    await page.getByRole('combobox',{name:'projects',exact:true}).selectOption('p1');
    await page.getByRole('button',{name:'New Task',exact:true}).click();
    const create=page.getByRole('dialog',{name:'Create task',exact:true});
    await create.getByLabel('Task type',{exact:false}).selectOption('t2');
    assert.equal(await create.getByLabel('Project',{exact:false}).inputValue(),'p1');
    await create.getByLabel('Environment',{exact:false}).selectOption('Test');
    await create.getByLabel('Title',{exact:false}).fill('Investigate login error');
    assert.equal(await create.getByLabel('Severity',{exact:true}).inputValue(),'Major');
    await create.getByRole('button',{name:'Assign to me',exact:true}).click();
    await create.getByText('Scheduling and release',{exact:true}).click();
    assert.equal(await create.getByLabel('Release',{exact:true}).locator('option').count(),2);
    await create.getByLabel('Release',{exact:true}).selectOption('v1');
    await create.getByLabel('Create another',{exact:true}).check();
    await create.getByRole('button',{name:'Create task',exact:true}).click();
    await create.getByText('DEMO-NEW created. Ready for another.').waitFor();
    assert.equal(lastCreate.title,'Investigate login error'); assert.equal(lastCreate.projectId,'p1'); assert.equal(lastCreate.scope,undefined);
    assert.equal(lastCreate.severity,'Major'); assert.equal(lastCreate.customFieldValues.environment,'Test'); assert.deepEqual(lastCreate.assigneeIds,['u1']);
    assert.equal(await create.getByLabel('Title',{exact:false}).inputValue(),'');
    assert.equal(await create.getByLabel('Release',{exact:true}).inputValue(),'v1');
    checks.push('Contextual creation, type defaults, scoped releases, assignment and Create another');
    await create.getByRole('button',{name:'Cancel',exact:true}).click();
    await page.getByRole('button',{name:'Table',exact:true}).click();
    const grid=page.getByRole('region',{name:'Tasks listing',exact:true});
    await grid.getByLabel('Search Tasks',{exact:true}).fill('DEMO');
    await grid.getByRole('button',{name:'Edit',exact:true}).click();
    const detail=page.getByRole('dialog',{name:'Task DEMO-1042',exact:true});
    const field=name=>detail.locator(`[data-task-field="${name}"]`);
    await field('title').getByLabel('Title',{exact:false}).fill('Updated inline title');
    await field('title').getByRole('button',{name:'Save',exact:true}).click();
    await field('title').getByText('Updated inline title',{exact:true}).waitFor();
    assert.equal(lastPatch.title,'Updated inline title'); assert.equal(lastPatch.expectedRevision,1);
    await field('description').getByRole('button',{name:'Edit Description'}).click();
    await field('description').getByLabel('Description',{exact:true}).fill('Temporary draft');
    await field('description').getByLabel('Description',{exact:true}).press('Escape');
    assert.equal(await detail.count(),1);
    assert.equal(await field('description').getByText('Temporary draft',{exact:true}).count(),0);
    await field('priority').getByRole('button',{name:'Edit Priority'}).click();
    await field('priority').getByLabel('Priority',{exact:false}).selectOption('HIGH');
    await field('priority').getByText('HIGH',{exact:true}).waitFor();
    await field('plannedEndDate').getByRole('button',{name:'Edit Planned end'}).click();
    await field('plannedEndDate').getByLabel('Planned end',{exact:true}).fill('');
    await field('plannedEndDate').getByRole('button',{name:'Save',exact:true}).click();
    await field('plannedEndDate').getByText('Add planned end...').waitFor(); assert.equal(lastPatch.plannedEndDate,null);
    await field('estimatedHours').getByRole('button',{name:'Edit Estimated hours'}).click();
    await field('estimatedHours').getByLabel('Estimated hours',{exact:true}).fill('0');
    await field('estimatedHours').getByRole('button',{name:'Save',exact:true}).click();
    await field('estimatedHours').getByText('0',{exact:true}).waitFor(); assert.equal(lastPatch.estimatedHours,0);
    checks.push('Inline editing, dropdown save, Escape cancellation, null clearing and zero values');
    failNext='conflict';
    await field('title').getByRole('button',{name:'Edit Title'}).click();
    await field('title').getByLabel('Title',{exact:false}).fill('Preserved draft');
    await field('title').getByRole('button',{name:'Save',exact:true}).click();
    await field('title').getByRole('button',{name:'Load latest and keep draft'}).waitFor();
    assert.equal(await field('title').getByLabel('Title',{exact:false}).inputValue(),'Preserved draft');
    await field('title').getByRole('button',{name:'Load latest and keep draft'}).click();
    await field('title').getByText(/Latest values loaded/).waitFor();
    await field('title').getByRole('button',{name:'Save',exact:true}).click();
    await field('title').getByText('Preserved draft',{exact:true}).waitFor();
    failNext='validation';
    await field('severity').getByRole('button',{name:'Edit Severity'}).click();
    await field('severity').getByLabel('Severity',{exact:true}).fill('Retain failed value');
    await field('severity').getByRole('button',{name:'Save',exact:true}).click();
    await field('severity').getByText('Example field validation failure').waitFor();
    assert.equal(await field('severity').getByLabel('Severity',{exact:true}).inputValue(),'Retain failed value');
    await field('severity').getByRole('button',{name:'Cancel',exact:true}).click();
    await field('title').getByRole('button',{name:'Edit Title'}).click();
    await field('title').getByLabel('Title',{exact:false}).fill('Preserved draft');
    await detail.getByLabel('Task status',{exact:true}).selectOption('s2');
    await page.waitForFunction(()=>document.querySelector('[aria-label="Task status"]')?.disabled === false);
    await field('title').getByRole('button',{name:'Save',exact:true}).click();
    await field('title').getByRole('button',{name:'Load latest and keep draft'}).waitFor();
    await field('title').getByRole('button',{name:'Load latest and keep draft'}).click();
    await field('title').getByText(/Latest values loaded/).waitFor();
    await field('title').getByRole('button',{name:'Save',exact:true}).click();
    await field('title').getByText('Preserved draft',{exact:true}).waitFor();
    checks.push('Conflict review/retry and failed-save draft preservation');
    await detail.getByRole('button',{name:'Edit Task type and custom fields',exact:true}).click();
    await detail.getByLabel('Risk',{exact:true}).fill('0');
    await detail.getByLabel('Verified',{exact:true}).selectOption('false');
    await detail.getByRole('button',{name:'Save type and fields',exact:true}).click();
    await detail.getByRole('button',{name:'Edit Task type and custom fields',exact:true}).waitFor();
    assert.deepEqual(lastPatch.customFieldValues,{risk:0,verified:false});
    await field('description').getByRole('button',{name:'Edit Description',exact:true}).click();
    await field('description').getByLabel('Description',{exact:true}).fill('**Expected outcome**\n\n- Keep formatting\n\n<script>window.__unsafe=true</script>\n\n[unsafe](javascript:alert(1))');
    await field('description').getByRole('button',{name:'Preview',exact:true}).click();
    await field('description').locator('strong').getByText('Expected outcome').waitFor();
    assert.equal(await page.evaluate(()=>window.__unsafe),undefined);
    assert.equal(await field('description').locator('a[href^="javascript:"]').count(),0);
    await field('description').getByRole('button',{name:'Save',exact:true}).click();
    await field('description').getByRole('button',{name:'Edit Description',exact:true}).waitFor();
    await field('description').locator('strong').getByText('Expected outcome').waitFor();
    checks.push('Custom values preserve zero/false and formatted descriptions safely preview and save');

    await detail.getByRole('button',{name:'Edit assignees',exact:true}).click();
    await detail.getByRole('button',{name:'Assign to me',exact:true}).click();
    await detail.getByLabel('Add assignee',{exact:true}).selectOption('u2');
    await detail.getByLabel('Primary owner',{exact:false}).selectOption('u2');
    await detail.getByRole('button',{name:'Save assignees',exact:true}).click();
    await detail.getByText('Raj Shah - Primary',{exact:true}).waitFor(); assert.deepEqual(assignments.assigneeIds,['u1','u2']);
    await detail.getByRole('button',{name:'History',exact:true}).click();
    await detail.getByRole('region',{name:'Task history',exact:true}).getByText('Priority',{exact:true}).waitFor();
    await detail.getByRole('button',{name:'Overview',exact:true}).click();
    await detail.getByRole('button',{name:'Open full page',exact:true}).click();
    await detail.getByRole('button',{name:'Return to drawer',exact:true}).waitFor(); assert(page.url().includes('viewTask=full'));
    await detail.getByRole('button',{name:'Return to drawer',exact:true}).click();
    await detail.getByRole('button',{name:'Open full page',exact:true}).waitFor();
    await fs.mkdir('docs/walkthrough',{recursive:true});
    await page.screenshot({path:'docs/walkthrough/task-editor-desktop.png'});
    await page.setViewportSize({width:390,height:844});
    await page.evaluate(()=>{document.documentElement.classList.add('dark');});
    await page.screenshot({path:'docs/walkthrough/task-editor-mobile-dark.png'});
    assert(await detail.evaluate(el=>el.scrollWidth <= el.clientWidth+1),'Task drawer overflows horizontally');
    await detail.getByRole('button',{name:'Close task',exact:true}).click();
    assert.equal(await page.getByRole('combobox',{name:'projects',exact:true}).inputValue(),'p1');
    await grid.getByText('Preserved draft',{exact:true}).waitFor();
    assert.equal(await grid.getByLabel('Search Tasks',{exact:true}).inputValue(),'DEMO');
    checks.push('Multi-assignees/primary owner, full-page mode, preserved list context and mobile dark layout');
    readonly=true;
    await page.goto(base+'/tasks?taskId=task1');
    await detail.getByText('Preserved draft',{exact:true}).waitFor();
    assert.equal(await detail.getByRole('button',{name:/^Edit /}).count(),0);
    assert(await detail.getByLabel('Task status',{exact:true}).isDisabled());
    assert.equal(await detail.getByText('Charge amount',{exact:true}).count(),0);
    checks.push('Read-only task access hides editing and financial fields');
    assert.deepEqual(errors,[]);
    await fs.writeFile('docs/walkthrough/task-editing-browser-results.json',JSON.stringify({checks,errors},null,2)+'\n');
    console.log(JSON.stringify({passed:checks.length,checks},null,2));
  } finally { await browser.close(); }
})().catch(e=>{console.error(e);process.exit(1);});
