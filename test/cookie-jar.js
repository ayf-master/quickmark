/**
 * 极简 cookie jar — 支持多个 cookie 域名隔离
 * 不依赖第三方库, 跑集成测试用
 */
class CookieJar {
  constructor() {
    this.cookies = new Map();  // name -> { value, domain, path, expires }
  }

  /** 解析并存储一个 Set-Cookie 字符串 */
  setCookie(setCookieStr, domain, defaultPath) {
    // 形如: name=value; Path=/; Expires=...; HttpOnly; SameSite=Lax
    const parts = setCookieStr.split(';').map(p => p.trim());
    const [first, ...attrs] = parts;
    const [name, ...valueParts] = first.split('=');
    if (!name) return;
    const value = valueParts.join('=');
    const cookie = {
      value,
      domain,
      path: defaultPath || '/',
      expires: null
    };
    for (const attr of attrs) {
      const [k, v] = attr.split('=');
      if (k.toLowerCase() === 'path' && v) cookie.path = v;
      else if (k.toLowerCase() === 'expires' && v) cookie.expires = new Date(v).getTime();
      else if (k.toLowerCase() === 'max-age' && v) cookie.expires = Date.now() + Number(v) * 1000;
    }
    // 过期清理
    if (cookie.expires && cookie.expires < Date.now()) {
      this.cookies.delete(name);
      return;
    }
    // 空值表示清除 (curl 行为)
    if (value === '' || value === '""') {
      this.cookies.delete(name);
      return;
    }
    this.cookies.set(name, cookie);
  }

  /** 直接设置一个 cookie (测试伪造 token 用) */
  setRaw(cookieStr, domain, path) {
    const [first, ...attrs] = cookieStr.split(';').map(p => p.trim());
    const [name, ...valueParts] = first.split('=');
    this.cookies.set(name, {
      value: valueParts.join('='),
      domain: domain || 'localhost',
      path: path || '/',
      expires: null
    });
  }

  getCookie(name) {
    const c = this.cookies.get(name);
    if (!c) return null;
    if (c.expires && c.expires < Date.now()) {
      this.cookies.delete(name);
      return null;
    }
    return c;
  }

  /** 输出 Cookie 请求头 */
  cookieHeader(domain, path) {
    const valid = [];
    for (const [name, c] of this.cookies.entries()) {
      if (c.expires && c.expires < Date.now()) continue;
      // 简单路径匹配
      if (!path.startsWith(c.path)) continue;
      valid.push(`${name}=${c.value}`);
    }
    return valid.join('; ');
  }
}

module.exports = { CookieJar };
