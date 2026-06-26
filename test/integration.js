#!/usr/bin/env node
/**
 * QuickMark 阶段 4 集成测试
 *
 * 跑法:
 *   USE_PRISMA=0 node test/integration.js   # pool 模式
 *   USE_PRISMA=1 node test/integration.js   # prisma 模式
 *
 * 覆盖:
 *   - 阶段 3: 14 API 字段类型 / 写后读一致 / 404 / 400 / 分类循环
 *   - 阶段 4 新增: 鉴权 / cookie / CSRF / 多用户隔离
 */
const http = require('http');
const { CookieJar } = require('./cookie-jar');

const BASE = 'http://localhost:3000';
const USE_PRISMA = process.env.USE_PRISMA === '1';
let pass = 0, fail = 0;

// 共享 cookie jar (admin)
const adminJar = new CookieJar();
// alice 独立 jar
const aliceJar = new CookieJar();
// 伪造 token jar
const fakeJar = new CookieJar();

function req(method, path, body, jar) {
  return new Promise((resolve, reject) => {
    const url = new URL(BASE + path);
    const opts = {
      method,
      hostname: url.hostname,
      port: url.port,
      path: url.pathname + url.search,
      headers: { 'Content-Type': 'application/json' }
    };
    // 自动加 cookie
    if (jar) {
      const cookieStr = jar.cookieHeader(url.host, url.pathname);
      if (cookieStr) opts.headers.Cookie = cookieStr;
    }
    const r = http.request(opts, (res) => {
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => {
        // 自动存 Set-Cookie
        if (jar && res.headers['set-cookie']) {
          res.headers['set-cookie'].forEach(c => jar.setCookie(c, url.host, url.pathname));
        }
        // CSRF token 提取: 从 cookie 拿 csrf, 加到响应 body
        let body = null;
        try { body = data ? JSON.parse(data) : null; }
        catch { body = data; }
        if (jar && body === null && method === 'POST' && path.includes('/auth/')) {
          // 不影响
        }
        resolve({ status: res.statusCode, body, headers: res.headers });
      });
    });
    r.on('error', reject);
    if (body) r.write(JSON.stringify(body));
    r.end();
  });
}

/** 带 CSRF token 的 POST/PUT/DELETE 包装 */
function authedReq(method, path, body, jar) {
  // CSRF token 来自 cookie
  const csrfToken = jar.getCookie('qm_csrf')?.value;
  if (!csrfToken && method !== 'GET') {
    return Promise.resolve({ status: 0, body: { error: 'no csrf' } });
  }
  return new Promise((resolve, reject) => {
    const url = new URL(BASE + path);
    const opts = {
      method,
      hostname: url.hostname,
      port: url.port,
      path: url.pathname + url.search,
      headers: { 'Content-Type': 'application/json' }
    };
    if (jar) {
      const cookieStr = jar.cookieHeader(url.host, url.pathname);
      if (cookieStr) opts.headers.Cookie = cookieStr;
    }
    if (csrfToken) opts.headers['X-CSRF-Token'] = csrfToken;
    const r = http.request(opts, (res) => {
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => {
        if (jar && res.headers['set-cookie']) {
          res.headers['set-cookie'].forEach(c => jar.setCookie(c, url.host, url.pathname));
        }
        let body = null;
        try { body = data ? JSON.parse(data) : null; }
        catch { body = data; }
        resolve({ status: res.statusCode, body });
      });
    });
    r.on('error', reject);
    if (body) r.write(JSON.stringify(body));
    r.end();
  });
}

function ok(name, cond) {
  if (cond) { pass++; console.log(`  ✓ ${name}`); }
  else { fail++; console.log(`  ✗ ${name}`); }
}

async function run() {
  console.log(`\n=== 集成测试 (USE_PRISMA=${USE_PRISMA ? '1' : '0'}) ===\n`);

  // ========== 阶段 4: 鉴权前置 (Prisma 模式专用) ==========
  if (!USE_PRISMA) {
    console.log('\n0~5. 鉴权前置: 跳过 (pool 模式不强制鉴权)');
    // 用空 jar 当 dummy, 业务 API 不需要鉴权
    adminJar.setRaw('qm_access=pool; Path=/', 'localhost', '/');
  } else {
  console.log('0. 鉴权前置: admin 登录');
  const loginR = await req('POST', '/api/auth/login', { username: 'admin', password: 'password' }, adminJar);
  ok('POST /api/auth/login 200', loginR.status === 200);
  ok('返回 user.id', loginR.body && loginR.body.user && loginR.body.user.id === 1);
  ok('admin jar 含 access cookie', !!adminJar.getCookie('qm_access'));
  ok('admin jar 含 refresh cookie', !!adminJar.getCookie('qm_refresh'));
  ok('admin jar 含 csrf cookie', !!adminJar.getCookie('qm_csrf'));
  const adminCsrf = adminJar.getCookie('qm_csrf')?.value;
  ok('csrf token 长度 >= 32', adminCsrf && adminCsrf.length >= 32);

  console.log('\n1. 错密码登录');
  const wrongJar = new CookieJar();
  const wrongLogin = await req('POST', '/api/auth/login', { username: 'admin', password: 'wrong' }, wrongJar);
  ok('错密码 401', wrongLogin.status === 401);

  console.log('\n2. 未登录访问业务 API (期望 401)');
  const noAuthJar = new CookieJar();
  const noAuth = await req('GET', '/api/notes', null, noAuthJar);
  ok('GET /api/notes 401', noAuth.status === 401);

  console.log('\n3. /api/auth/me (有 cookie 200)');
  const me = await req('GET', '/api/auth/me', null, adminJar);
  ok('me 200', me.status === 200);
  ok('me 返回 admin', me.body && me.body.user && me.body.user.username === 'admin');

  console.log('\n4. CSRF 防护 (写操作无 token 403)');
  const noCsrf = await req('POST', '/api/notes', { title: 'no-csrf' }, adminJar);
  ok('POST 无 CSRF 403', noCsrf.status === 403);

  console.log('\n5. CSRF token 不匹配 403');
  // 用 admin cookie 但错的 CSRF 头
  const fakeCsrfJar = new CookieJar();
  // 先登录拿 cookie
  await req('POST', '/api/auth/login', { username: 'admin', password: 'password' }, fakeCsrfJar);
  const mismatch = await new Promise((resolve, reject) => {
    const url = new URL(BASE + '/api/notes');
    const opts = {
      method: 'POST',
      hostname: url.hostname,
      port: url.port,
      path: url.pathname,
      headers: {
        'Content-Type': 'application/json',
        'Cookie': fakeCsrfJar.cookieHeader(url.host, url.pathname),
        'X-CSRF-Token': 'A'.repeat(64)  // 错的 token
      }
    };
    const r = http.request(opts, (res) => {
      let d = '';
      res.on('data', c => d += c);
      res.on('end', () => resolve({ status: res.statusCode, body: d }));
    });
    r.on('error', reject);
    r.write(JSON.stringify({ title: 'mismatch' }));
    r.end();
  });
  ok('CSRF 不匹配 403', mismatch.status === 403);
  }  // end if (USE_PRISMA) 鉴权前置

  // ========== 阶段 3: 业务 API (用 admin cookie) ==========
  // pool 模式 adminJar 是 dummy, Prisma 模式是真 admin cookie
  // 写操作用 req() (不带 CSRF, 兼容 pool 模式) 或 authedReq() (带 CSRF, 仅 Prisma)
  const wReq = USE_PRISMA ? authedReq : req;

  console.log('\n6. 读 API 全 200 (admin 已登录)');
  const reads = [
    '/api/categories',
    '/api/notes',
    '/api/notes/16',
    '/api/notes?pinned=true',
    '/api/notes?category_id=6'
  ];
  for (const p of reads) {
    const r = await req('GET', p, null, adminJar);
    ok(`GET ${p} 200`, r.status === 200);
  }

  console.log('\n7. 字段类型校验');
  const cats = await req('GET', '/api/categories', null, adminJar);
  ok('categories 是数组', Array.isArray(cats.body));
  if (cats.body.length > 0) {
    const c = cats.body[0];
    ok('category.id number', typeof c.id === 'number');
    ok('category.name string', typeof c.name === 'string');
    ok('category.note_count number', typeof c.note_count === 'number');
    ok('category.parent_id 是 null 或 number', c.parent_id === null || typeof c.parent_id === 'number');
    ok('category.created_at ISO string', typeof c.created_at === 'string' && c.created_at.includes('T'));
  }
  const note16 = await req('GET', '/api/notes/16', null, adminJar);
  ok('note.is_pinned 是 bool/0/1', typeof note16.body.is_pinned === 'boolean' || (typeof note16.body.is_pinned === 'number' && (note16.body.is_pinned === 0 || note16.body.is_pinned === 1)));
  ok('note.category_ids 是数组', Array.isArray(note16.body.category_ids));
  ok('note.category_names 是数组', Array.isArray(note16.body.category_names));

  console.log('\n8. 404 边界');
  const nf1 = await req('GET', '/api/notes/9999', null, adminJar);
  ok('GET /api/notes/9999 404', nf1.status === 404);

  console.log('\n9. 写后读一致性 (admin cookie + CSRF)');
  const create = await wReq('POST', '/api/notes', {
    title: '集成测试' + Date.now(),
    content: 'auto-generated',
    category_ids: [12]
  }, adminJar);
  ok('POST /api/notes 201', create.status === 201);
  ok('创建返回 id', create.body && typeof create.body.id === 'number');
  const newId = create.body.id;

  const read = await req('GET', `/api/notes/${newId}`, null, adminJar);
  ok('GET 读回 200', read.status === 200);
  ok('title 一致', read.body.title === create.body.title);

  const update = await wReq('PUT', `/api/notes/${newId}`, { title: 'updated-集成' }, adminJar);
  ok('PUT 200', update.status === 200);
  ok('title 已更新', update.body.title === 'updated-集成');

  const del = await wReq('DELETE', `/api/notes/${newId}`, null, adminJar);
  ok('DELETE 200', del.status === 200);

  const read404 = await req('GET', `/api/notes/${newId}`, null, adminJar);
  ok('删除后 404', read404.status === 404);

  console.log('\n10. 400 错误');
  const bad = await wReq('POST', '/api/notes', { content: 'no title' }, adminJar);
  ok('空标题 400', bad.status === 400);

  console.log('\n11. 分类循环防护');
  const cycle = await wReq('PUT', '/api/categories/6', { parent_id: 11 }, adminJar);
  ok('分类循环 400', cycle.status === 400);

  // ========== 阶段 4: 多用户隔离 (Prisma 模式专用) ==========
  if (!USE_PRISMA) {
    console.log('\n12. 多用户隔离: 跳过 (pool 模式不支持, 仅 Prisma 模式启用)');
    console.log('  - pool 模式作为应急回退, 不实现多用户隔离');
  } else {
    console.log('\n12. 多用户隔离: 注册 alice + 越权防护');
  }

  if (USE_PRISMA) {
  // alice 登录 (admin 先前已存在, alice 也是)
  const aliceLogin = await req('POST', '/api/auth/login', { username: 'alice', password: 'alice123' }, aliceJar);
  ok('alice 登录 200', aliceLogin.status === 200);
  ok('alice.id === 2', aliceLogin.body && aliceLogin.body.user && aliceLogin.body.user.id === 2);

  // alice 创建笔记
  const aliceCreate = await wReq('POST', '/api/notes', { title: 'alice-private', content: 'secret' }, aliceJar);
  ok('alice 创建 201', aliceCreate.status === 201);
  const aliceNoteId = aliceCreate.body.id;

  // alice 列表 (看到自己的)
  const aliceList = await req('GET', '/api/notes', null, aliceJar);
  ok('alice 列表 200', aliceList.status === 200);
  ok('alice 列表包含自己的笔记', aliceList.body.some(n => n.id === aliceNoteId));

  // admin 列表 (看不到 alice 笔记)
  const adminList = await req('GET', '/api/notes', null, adminJar);
  ok('admin 列表 200', adminList.status === 200);
  ok('admin 列表不含 alice 笔记', !adminList.body.some(n => n.id === aliceNoteId));

  // admin 越权访问 alice 笔记 404
  const cross1 = await req('GET', `/api/notes/${aliceNoteId}`, null, adminJar);
  ok('admin 越权访问 alice 笔记 404', cross1.status === 404);

  // alice 越权访问 admin 笔记 16 404
  const cross2 = await req('GET', '/api/notes/16', null, aliceJar);
  ok('alice 越权访问 admin 笔记 404', cross2.status === 404);

  // admin 越权改 alice 笔记 404
  const cross3 = await wReq('PUT', `/api/notes/${aliceNoteId}`, { title: 'hijack' }, adminJar);
  ok('admin 越权 PUT alice 笔记 404', cross3.status === 404);

  // alice 越权删 admin 笔记 404
  const cross4 = await wReq('DELETE', '/api/notes/16', null, aliceJar);
  ok('alice 越权 DELETE admin 笔记 404', cross4.status === 404);

  // alice 创建分类
  const aliceCat = await wReq('POST', '/api/categories', { name: 'Alice专用' + Date.now(), color: '#ff0000' }, aliceJar);
  ok('alice 创建分类 201', aliceCat.status === 201);
  const aliceCatId = aliceCat.body.id;
  ok('创建返回的分类是 snake_case 字段', aliceCat.body.parent_id !== undefined && aliceCat.body.created_at !== undefined);

  // admin 看不到 alice 分类
  const adminCats = await req('GET', '/api/categories', null, adminJar);
  ok('admin 分类不含 alice 的', !adminCats.body.some(c => c.id === aliceCatId));

  // 清理 alice 数据
  await wReq('DELETE', `/api/notes/${aliceNoteId}`, null, aliceJar);
  await wReq('DELETE', `/api/categories/${aliceCatId}`, null, aliceJar);
  }  // end if (USE_PRISMA) 多用户隔离

  console.log('\n13. 伪造 JWT 401 (Prisma 模式)');
  if (USE_PRISMA) {
    fakeJar.setCookie('qm_access=eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOjk5OTksInR5cGUiOiJhY2Nlc3MiLCJpYXQiOjE3ODIzODc2NzYsImV4cCI6OTk5OTk5OTk5OX0.fakesignature; Path=/', 'localhost', '/api/notes');
    const fake = await req('GET', '/api/notes', null, fakeJar);
    ok('伪造 token 401', fake.status === 401);
  } else {
    console.log('  - 跳过 (pool 模式不强制鉴权)');
  }

  console.log('\n14. /api/auth/refresh (Prisma 模式)');
  if (USE_PRISMA) {
    const refreshJar = new CookieJar();
    await req('POST', '/api/auth/login', { username: 'admin', password: 'password' }, refreshJar);
    const beforeRefresh = refreshJar.getCookie('qm_refresh')?.value;
    const refresh = await wReq('POST', '/api/auth/refresh', null, refreshJar);
    ok('refresh 200', refresh.status === 200);
    const afterRefresh = refreshJar.getCookie('qm_refresh')?.value;
    ok('refresh token 变化 (含 jti 随机)', beforeRefresh && afterRefresh && beforeRefresh !== afterRefresh);
    const afterUse = await req('GET', '/api/auth/me', null, refreshJar);
    ok('refresh 后 access 仍有效 (me 200)', afterUse.status === 200);
  } else {
    console.log('  - 跳过 (pool 模式)');
  }

  console.log('\n15. 登出 (Prisma 模式)');
  if (USE_PRISMA) {
    const logoutJar = new CookieJar();
    await req('POST', '/api/auth/login', { username: 'admin', password: 'password' }, logoutJar);
    const logout = await wReq('POST', '/api/auth/logout', null, logoutJar);
    ok('logout 200', logout.status === 200);
    const afterLogout = await req('GET', '/api/auth/me', null, logoutJar);
    ok('登出后 /me 401', afterLogout.status === 401);
  } else {
    console.log('  - 跳过 (pool 模式)');
  }

  console.log(`\n=== ${pass} 通过, ${fail} 失败 ===`);
  process.exit(fail > 0 ? 1 : 0);
}

run().catch(e => { console.error('测试异常:', e); process.exit(2); });
