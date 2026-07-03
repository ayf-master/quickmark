const fs = require('fs');
let sql = fs.readFileSync('C:/quickmark_final.sql', 'utf8');
const lines = sql.split('\n');
if (lines[0].includes('Warning')) lines.shift();
sql = lines.join('\n');
// 替换 \" 为 "
sql = sql.replace(/\\"/g, '"');
const outPath = 'd:/vibeCoding/quickmark/quickmark_final_clean.sql';
fs.writeFileSync(outPath, sql, 'utf8');
console.log('清理完成:', fs.statSync(outPath).size, 'bytes');
