/** @type {import('tailwindcss').Config} */
// 编译期 Tailwind: 必须显式声明 content, 否则扫不到 class, 编译出空 CSS
// Play CDN 是运行时扫 DOM 注入, 所以旧版不用配
module.exports = {
  content: [
    './index.html',
    './src/**/*.{vue,js}'
  ],
  theme: {
    extend: {}
  },
  plugins: []
};
