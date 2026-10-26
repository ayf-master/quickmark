/**
 * 恢复 stu 和 online_study 数据库
 * 从 .ibd 文件恢复数据
 *
 * 用法: node docs/restore_stu.js
 */
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const MYSQL = '"D:/mysql/mysql-8.0.31-winx64/bin/mysql" -u root -p你的数据库密码';
const DATA = 'D:/mysql/mysql-8.0.31-winx64/data';
const BACKUP = 'D:/mysql-ibd-backup';  // 先备份原始的 .ibd

function run(cmd) {
  console.log('>', cmd);
  try {
    const out = execSync(cmd, { encoding: 'utf8', maxBuffer: 50*1024*1024 });
    if (out.trim()) console.log(out.trim());
    return true;
  } catch(e) {
    console.error(e.stderr || e.message);
    return false;
  }
}

function sql(db, query) {
  return run(`${MYSQL} -e "${query.replace(/"/g, '\\"').replace(/\n/g, ' ')}" ${db}`);
}

// 表定义（从 ibd2sdi 提取的精确结构）
const TABLES = {
  stu: [
    { name: 'student', autoInc: false, schema: `CREATE TABLE student (
      Sno char(8) NOT NULL,
      Sname varchar(20),
      Ssex char(6),
      Sage int,
      Smajor varchar(40),
      S_entrance date,
      \`武魂\` varchar(10),
      PRIMARY KEY (Sno)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='学生信息表'` },
    { name: 'course', autoInc: false, schema: `CREATE TABLE course (
      Cno char(5) NOT NULL,
      Cname varchar(40),
      Ccredit smallint,
      Cpno char(5),
      PRIMARY KEY (Cno)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='课程信息表'` },
    { name: 'sc', autoInc: false, schema: `CREATE TABLE sc (
      Sno char(8) NOT NULL,
      Cno char(5) NOT NULL,
      Grade smallint,
      Semester char(5),
      Teachingclass char(8),
      PRIMARY KEY (Sno, Cno)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='学生选课表'` },
    { name: 'dept_age', autoInc: false, schema: `CREATE TABLE dept_age (
      Sdept char(15),
      Avg_age smallint
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci` }
  ],
  online_study: [
    { name: 'category', autoInc: true, schema: `CREATE TABLE category (
      id int NOT NULL AUTO_INCREMENT,
      name varchar(30),
      PRIMARY KEY (id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci` },
    { name: 'chapter', autoInc: true, schema: `CREATE TABLE chapter (
      id int NOT NULL AUTO_INCREMENT,
      course_id int,
      chapter_name varchar(50),
      sort_num int,
      PRIMARY KEY (id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci` },
    { name: 'course', autoInc: true, schema: `CREATE TABLE course (
      id int NOT NULL AUTO_INCREMENT,
      name varchar(50),
      category_id int,
      teacher_id int,
      description varchar(200),
      create_time datetime,
      PRIMARY KEY (id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci` },
    { name: 'course_resource', autoInc: true, schema: `CREATE TABLE course_resource (
      id int NOT NULL AUTO_INCREMENT,
      chapter_id int,
      course_id int,
      resource_name varchar(50),
      file_path varchar(100),
      upload_time datetime,
      PRIMARY KEY (id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci` },
    { name: 'course_selection', autoInc: true, schema: `CREATE TABLE course_selection (
      id int NOT NULL AUTO_INCREMENT,
      student_id int,
      course_id int,
      select_time datetime,
      PRIMARY KEY (id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci` },
    { name: 'homework', autoInc: true, schema: `CREATE TABLE homework (
      id int NOT NULL AUTO_INCREMENT,
      course_id int,
      title varchar(50),
      requirement varchar(200),
      deadline datetime,
      teacher_id int,
      create_time datetime,
      PRIMARY KEY (id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci` },
    { name: 'homework_score', autoInc: true, schema: `CREATE TABLE homework_score (
      id int NOT NULL AUTO_INCREMENT,
      submit_id int,
      score int,
      comment varchar(200),
      correct_time datetime,
      PRIMARY KEY (id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci` },
    { name: 'homework_submit', autoInc: true, schema: `CREATE TABLE homework_submit (
      id int NOT NULL AUTO_INCREMENT,
      homework_id int,
      student_id int,
      file_path varchar(100),
      submit_time datetime,
      status varchar(20),
      PRIMARY KEY (id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci` },
    { name: 'resource_view', autoInc: true, schema: `CREATE TABLE resource_view (
      id int NOT NULL AUTO_INCREMENT,
      student_id int,
      resource_id int,
      chapter_id int,
      view_time datetime,
      PRIMARY KEY (id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci` },
    { name: 'study_record', autoInc: true, schema: `CREATE TABLE study_record (
      id int NOT NULL AUTO_INCREMENT,
      student_id int,
      chapter_id int,
      study_time datetime,
      progress int,
      PRIMARY KEY (id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci` },
    { name: 'user', autoInc: true, schema: `CREATE TABLE user (
      id int NOT NULL AUTO_INCREMENT,
      username varchar(20),
      password varchar(20),
      role varchar(10),
      real_name varchar(20),
      phone varchar(11),
      PRIMARY KEY (id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci` }
  ]
};

async function main() {
  // 1. 先备份原始 .ibd 文件
  console.log('\n=== 备份原始 .ibd 文件 ===');
  if (!fs.existsSync(BACKUP)) fs.mkdirSync(BACKUP, { recursive: true });
  for (const db of ['stu', 'online_study']) {
    const dbDir = `${DATA}/${db}`;
    const backupDbDir = `${BACKUP}/${db}`;
    if (!fs.existsSync(backupDbDir)) fs.mkdirSync(backupDbDir, { recursive: true });
    const files = fs.readdirSync(dbDir).filter(f => f.endsWith('.ibd'));
    for (const file of files) {
      const src = `${dbDir}/${file}`;
      const dst = `${backupDbDir}/${file}`;
      if (!fs.existsSync(dst)) {
        fs.copyFileSync(src, dst);
        console.log(`  备份: ${src} -> ${dst}`);
      } else {
        console.log(`  已存在: ${dst}`);
      }
    }
  }

  // 2. 恢复数据库
  for (const [dbName, tables] of Object.entries(TABLES)) {
    console.log(`\n=== 恢复数据库: ${dbName} ===`);

    sql('', `CREATE DATABASE IF NOT EXISTS \`${dbName}\` DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`);

    for (const table of tables) {
      console.log(`\n--- ${table.name} ---`);

      // 先删除已存在的表
      sql(dbName, `DROP TABLE IF EXISTS ${table.name}`);

      // 创建表
      sql(dbName, table.schema);

      // 丢弃新创建的 .ibd
      sql(dbName, `ALTER TABLE ${table.name} DISCARD TABLESPACE`);

      // 把原始 .ibd 复制回来
      const backupIbd = `${BACKUP}/${dbName}/${table.name}.ibd`;
      if (fs.existsSync(backupIbd)) {
        fs.copyFileSync(backupIbd, `${DATA}/${dbName}/${table.name}.ibd`);
        console.log(`  ✓ 复制 ${backupIbd}`);

        // 导入表空间
        const result = sql(dbName, `ALTER TABLE ${table.name} IMPORT TABLESPACE`);
        if (result) {
          // 验证行数
          try {
            const cnt = execSync(`${MYSQL} -e "SELECT COUNT(*) as cnt FROM ${dbName}.${table.name}"`, { encoding: 'utf8' });
            console.log(`  → ${cnt.split('\n').filter(l => /^\d/.test(l.trim()))[0]?.trim() || '?'} 行`);
          } catch(e) { console.log('  → 验证失败'); }
        }
      } else {
        console.log(`  ✗ 备份文件不存在: ${backupIbd}`);
      }
    }
  }

  console.log('\n=== 所有数据库恢复完成 ===');
  console.log('验证:');
  run(`${MYSQL} -e "SELECT COUNT(*) as stu_tables FROM information_schema.TABLES WHERE TABLE_SCHEMA='stu'"`);
  run(`${MYSQL} -e "SELECT COUNT(*) as online_tables FROM information_schema.TABLES WHERE TABLE_SCHEMA='online_study'"`);
}

main().catch(e => console.error(e));
