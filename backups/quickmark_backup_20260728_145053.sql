-- MySQL dump 10.13  Distrib 8.0.46, for Linux (x86_64)
--
-- Host: localhost    Database: quickmark
-- ------------------------------------------------------
-- Server version	8.0.46

/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!50503 SET NAMES utf8mb4 */;
/*!40103 SET @OLD_TIME_ZONE=@@TIME_ZONE */;
/*!40103 SET TIME_ZONE='+00:00' */;
/*!40014 SET @OLD_UNIQUE_CHECKS=@@UNIQUE_CHECKS, UNIQUE_CHECKS=0 */;
/*!40014 SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0 */;
/*!40101 SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='NO_AUTO_VALUE_ON_ZERO' */;
/*!40111 SET @OLD_SQL_NOTES=@@SQL_NOTES, SQL_NOTES=0 */;

--
-- Table structure for table `_prisma_migrations`
--

DROP TABLE IF EXISTS `_prisma_migrations`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `_prisma_migrations` (
  `id` varchar(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `checksum` varchar(64) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `finished_at` datetime(3) DEFAULT NULL,
  `migration_name` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `logs` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
  `rolled_back_at` datetime(3) DEFAULT NULL,
  `started_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `applied_steps_count` int unsigned NOT NULL DEFAULT '0',
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `_prisma_migrations`
--

LOCK TABLES `_prisma_migrations` WRITE;
/*!40000 ALTER TABLE `_prisma_migrations` DISABLE KEYS */;
INSERT INTO `_prisma_migrations` VALUES ('04837a1f-502a-4bd8-8e91-95d11d011ff5','8117eb69a6eacb9dd16934f0d1a51ddfddbdd030711b57d899dc64c42fcf76b3','2026-06-25 11:03:07.740','20260625190300_init','',NULL,'2026-06-25 11:03:07.740',0),('900923c3-baae-4530-89b2-23ce005a8c77','9d3a2b357c8908daca58ffd5795af28dcb869b3dcdf29e8ef692f7a5b480ba12','2026-06-25 11:33:24.238','20260625193000_v3_user_id','',NULL,'2026-06-25 11:33:24.238',0);
/*!40000 ALTER TABLE `_prisma_migrations` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `categories`
--

DROP TABLE IF EXISTS `categories`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `categories` (
  `id` int NOT NULL AUTO_INCREMENT,
  `name` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `parent_id` int DEFAULT NULL,
  `user_id` int NOT NULL,
  `color` varchar(7) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT '#6366f1',
  `created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `position` int NOT NULL DEFAULT '0',
  PRIMARY KEY (`id`),
  KEY `idx_parent` (`parent_id`),
  KEY `idx_parent_name` (`parent_id`,`name`),
  KEY `idx_user_id` (`user_id`),
  CONSTRAINT `categories_parent_id_fkey` FOREIGN KEY (`parent_id`) REFERENCES `categories` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `categories_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=46 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `categories`
--

LOCK TABLES `categories` WRITE;
/*!40000 ALTER TABLE `categories` DISABLE KEYS */;
INSERT INTO `categories` VALUES (4,'灵感',NULL,1,'#8b5cf6','2026-06-25 05:08:53.000','2026-07-07 02:44:03.913',3),(5,'AI知识',NULL,1,'#6366f1','2026-06-25 05:17:40.000','2026-07-07 02:44:03.900',1),(6,'零散知识',NULL,1,'#F59E0B','2026-06-25 06:21:05.000','2026-07-07 02:44:03.907',2),(7,'Python',5,1,'#3B82F6','2026-06-25 07:10:22.000','2026-06-25 11:33:13.000',0),(8,'LLM',5,1,'#8B5CF6','2026-06-25 07:10:22.000','2026-06-25 11:33:13.000',0),(11,'AI',6,1,'#5B8DEF','2026-06-25 07:14:23.000','2026-06-25 11:33:13.000',0),(12,'定律',6,1,'#10B981','2026-06-25 07:14:40.000','2026-06-25 11:33:13.000',0),(13,'Alice�ķ���',NULL,2,'#ff0000','2026-06-25 03:44:43.000','2026-06-25 03:44:43.000',0),(14,'�޸���֤',NULL,2,'#00ff00','2026-06-25 03:45:15.000','2026-06-25 03:45:15.000',0),(21,'计算机知识',NULL,1,'#5B8DEF','2026-07-02 23:58:11.000','2026-07-07 02:44:03.893',0),(22,'计算机网络',21,1,'#5B8DEF','2026-07-02 23:58:24.000','2026-07-02 23:58:24.000',0),(23,'python',21,1,'#10B981','2026-07-03 05:41:53.074','2026-07-03 05:41:53.074',0),(24,'SQLAlchemy',23,1,'#F59E0B','2026-07-03 05:42:13.273','2026-07-03 05:42:13.273',0),(25,'英语',NULL,1,'#EC4899','2026-07-03 06:01:53.815','2026-07-07 02:44:03.919',4),(26,'flask',23,1,'#F59E0B','2026-07-03 07:22:41.770','2026-07-03 07:22:41.770',0),(27,'Python 工程化',23,1,'#10B981','2026-07-05 11:25:47.264','2026-07-05 11:25:47.264',0),(28,'前端',21,1,'#F59E0B','2026-07-06 07:01:57.434','2026-07-06 07:01:57.434',0),(29,'javascript',28,1,'#5B8DEF','2026-07-06 07:02:13.882','2026-07-06 07:02:13.882',0),(30,'Vue',28,1,'#5B8DEF','2026-07-06 10:03:47.098','2026-07-06 10:03:47.098',0),(31,'问题',NULL,1,'#5B8DEF','2026-07-06 10:06:48.221','2026-07-07 02:44:03.927',5),(33,'教资',NULL,1,'#5B8DEF','2026-07-15 08:48:06.567','2026-07-15 08:48:24.482',0),(34,'科目一（综合素质）',33,1,'#5B8DEF','2026-07-15 08:48:14.185','2026-07-16 03:26:08.925',0),(35,'教育观',34,1,'#EC4899','2026-07-15 08:49:23.501','2026-07-15 08:49:23.501',0),(38,'学生观',34,1,'#EC4899','2026-07-15 09:06:58.790','2026-07-16 01:41:46.715',0),(39,'教师观',34,1,'#EC4899','2026-07-16 00:45:03.157','2026-07-16 00:45:03.157',0),(40,'职业道德',34,1,'#EC4899','2026-07-16 01:04:00.419','2026-07-16 01:04:00.419',0),(41,'科目二（教育知识与能力）',33,1,'#5B8DEF','2026-07-16 03:26:31.253','2026-07-16 03:26:31.253',0),(42,'教育基础知识和基本原理',41,1,'#10B981','2026-07-16 03:26:50.857','2026-07-16 03:26:50.857',0),(44,'threeJs',28,1,'#5B8DEF','2026-07-22 10:15:37.355','2026-07-22 10:15:37.355',0);
/*!40000 ALTER TABLE `categories` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `feedback`
--

DROP TABLE IF EXISTS `feedback`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `feedback` (
  `id` int NOT NULL AUTO_INCREMENT,
  `content` text COLLATE utf8mb4_unicode_ci NOT NULL,
  `contact` varchar(200) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `user_id` int DEFAULT NULL,
  `created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  KEY `feedback_user_id_fkey` (`user_id`),
  CONSTRAINT `feedback_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `feedback`
--

LOCK TABLES `feedback` WRITE;
/*!40000 ALTER TABLE `feedback` DISABLE KEYS */;
INSERT INTO `feedback` VALUES (1,'111','3351247805@qq.com',1,'2026-07-03 02:01:56.915');
/*!40000 ALTER TABLE `feedback` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `note_categories`
--

DROP TABLE IF EXISTS `note_categories`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `note_categories` (
  `note_id` int NOT NULL,
  `category_id` int NOT NULL,
  PRIMARY KEY (`note_id`,`category_id`),
  KEY `idx_category_id` (`category_id`),
  CONSTRAINT `note_categories_category_id_fkey` FOREIGN KEY (`category_id`) REFERENCES `categories` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `note_categories_note_id_fkey` FOREIGN KEY (`note_id`) REFERENCES `notes` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `note_categories`
--

LOCK TABLES `note_categories` WRITE;
/*!40000 ALTER TABLE `note_categories` DISABLE KEYS */;
INSERT INTO `note_categories` VALUES (16,11),(17,12),(69,21),(52,22),(53,24),(54,24),(55,24),(56,24),(67,24),(57,25),(58,26),(59,26),(61,26),(60,27),(62,29),(63,29),(72,29),(76,29),(64,30),(68,30),(71,30),(73,30),(75,30),(65,31),(74,31),(77,35),(78,35),(79,38),(80,39),(81,39),(82,40),(84,42),(85,42),(86,44);
/*!40000 ALTER TABLE `note_categories` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `notes`
--

DROP TABLE IF EXISTS `notes`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `notes` (
  `id` int NOT NULL AUTO_INCREMENT,
  `title` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `content` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
  `is_pinned` tinyint(1) NOT NULL DEFAULT '0',
  `user_id` int NOT NULL,
  `created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `position` int NOT NULL DEFAULT '0',
  PRIMARY KEY (`id`),
  KEY `idx_user_id` (`user_id`),
  CONSTRAINT `notes_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=87 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `notes`
--

LOCK TABLES `notes` WRITE;
/*!40000 ALTER TABLE `notes` DISABLE KEYS */;
INSERT INTO `notes` VALUES (16,'RLHF','## 是一种结合强化学习与人类反馈的训练方法，用于让AI生成的内容更符合人类期望和价值观',0,1,'2026-06-25 07:14:25.000','2026-07-07 07:36:52.275',0),(17,'定律','# 古德哈特定律\n## 古德哈特定律指出：“当一个指标变成目标，它就不再是一个好的指标。”\n### 指标：用来客观衡量、反映真实状况的观测工具、衡量尺度，作用是如实描述现实，本身不带强制考核要求，只做参考、反馈、评估依据。\n### 目标：人为把某一个指标绑定考核、奖惩、任务要求，强制要求达成固定数值，把衡量标准变成必须完成的硬性任务。\n![你好啊](/uploads/mqt8mxyu-8fqcgu.png)\n### 标题1',0,1,'2026-06-25 07:14:44.000','2026-07-02 15:10:50.000',0),(36,'alice-private','alice secret',0,2,'2026-06-25 03:44:23.000','2026-06-25 03:44:23.000',0),(37,'alice-private','alice secret',0,2,'2026-06-25 03:44:30.000','2026-06-25 03:44:30.000',0),(52,'SSH','# SSH 完整原理（通俗 + 分层拆解）\n\n## 一、SSH 是什么\nSSH（Secure Shell，安全外壳协议），用来**加密远程登录服务器**，替代古老、明文传输的 Telnet。\n\n- **Telnet**：账号密码裸奔，抓包就能窃取。\n- **SSH**：全程加密，中间人看不到任何账号、命令、数据。\n\n---\n\n## 二、三大核心加密技术（底层支撑）\nSSH 混合多种加密算法，各司其职：\n\n### 1. 对称加密（会话加密，传输用）\n- **特点**：同一个密钥加密、解密，**速度快**。\n- **问题**：密钥怎么安全发给对方？直接传会被截获。\n- **作用**：建立连接成功后，后续所有命令、文件传输全靠它加密。\n\n### 2. 非对称加密（RSA/ECC，身份校验用）\n一对密钥绑定、永不重复：\n- **私钥（Private Key）**：自己留着，**绝对不能泄露**。\n- **公钥（Public Key）**：可以随便公开，只能加密、**不能反推私钥**。\n\n**加密规则**：\n- 公钥加密的数据 → 只有对应私钥能解开。\n- 私钥签名的数据 → 对应公钥可以验证真伪。\n\n**作用**：解决「对称密钥怎么安全交换」+「确认双方身份不被冒充」。\n\n### 3. 哈希算法（完整性校验）\nMD5/SHA256，用来校验数据有没有被篡改，中间人改内容会直接校验失败。\n\n---\n\n## 三、SSH 连接全过程（分两大阶段）\n\n### 阶段 1：握手协商，建立加密通道（服务器身份校验）\n1. 客户端发起连接，双方交换支持的加密算法。\n2. 服务器把自己的**主机公钥**发给客户端。\n3. 客户端**第一次连接**时弹窗提示：保存服务器**主机指纹（公钥哈希）**。  \n   后续再连，客户端会对比指纹，不一致 = 服务器被劫持，直接断开。\n4. 双方用非对称加密，**安全协商出一份临时对称会话密钥**。\n5. 从这一步开始，所有收发数据全部用这个对称密钥加密。\n\n> **这一步只保证通道加密，还没登录账号。**\n\n---\n\n### 阶段 2：用户身份认证（两种登录方式）\n\n#### 方式 A：密码登录（不推荐）\n- 客户端把用户名 + 密码，通过加密通道发给服务端。\n- 服务器校验账号密码是否正确，通过则登录成功。\n- **缺陷**：攻击者可暴力扫描 22 端口，字典猜密码。\n\n#### 方式 B：公私钥免密登录（你现在在用的，安全）\n**前提**：服务器 `~/.ssh/authorized_keys` 里存有你本地私钥配套的公钥。\n\n**登录流程**：\n1. 客户端告知服务器：我持有私钥。\n2. 服务器生成一段随机**「挑战文本」**，用你的公钥加密后发回。\n3. 只有你本地私钥能解开这段密文。\n4. 客户端用私钥解密，把原文发回给服务器。\n5. 服务器拿本地存的公钥核对原文一致，确认是本人，直接放行登录。\n\n**关键逻辑**：\n- 全程**不会传输私钥**，私钥永远只存在你电脑本地。\n- 哪怕抓包，也拿不到私钥、无法伪造登录。\n- 公钥只是验证工具，泄露完全没事。\n\n---\n\n## 四、私钥 / 公钥 各自作用总结\n\n| 钥匙 | 位置 | 作用 | 泄露后果 |\n|------|------|------|----------|\n| **私钥**（本地 `id_rsa`） | 你的电脑 | 身份凭证，解密挑战、生成签名 | 别人能登录你的服务器（删除服务器对应公钥即可作废） |\n| **公钥**（`ssh-rsa` 字符串） | 服务器 `authorized_keys` | 验证私钥签名，可公开 | 泄露无风险，随时可用私钥重新生成：`ssh-keygen -y -f 私钥文件` |\n\n---\n\n## 五、SSH 安全优势对比明文 Telnet\n- ✅ 所有传输内容加密，运营商、中间人无法窃听账号、命令。\n- ✅ 服务器主机指纹防中间人劫持。\n- ✅ 密钥登录几乎无法暴力破解，远强于密码。\n- ✅ 额外支持 SFTP 文件传输、端口转发，全部加密。\n\n---\n\n## 六、通俗比喻理解（快递送信）\n把 SSH 比作**快递送信**：\n\n- 服务器大门挂一把**公钥锁**（`authorized_keys`）。\n- 只有你手里的**私钥钥匙**能打开这把锁。\n- 开门前双方先协商一个**加密信封（对称会话密钥）**，后面所有信件全塞加密信封，外人看不到内容。\n- **密码登录** = 门有个数字密码，别人可以反复试密码破门。\n- **密钥登录** = 只有你有唯一钥匙，且钥匙从不离身，安全得多。',0,1,'2026-07-02 23:58:33.000','2026-07-07 02:39:22.252',5),(53,'Session','## 核心原理\n\n1. 设计模式：**Unit of Work 工作单元模式**\n所有数据库变更先缓存在 Session 内存，不直接操作数据库，统一提交后一次性执行 SQL。\n\n2. 事务容器：Session 承载完整数据库事务，满足 ACID 四大特性。\n\n3. 对象追踪：自动跟踪 ORM 对象的新增、修改、删除状态。\n\n## 核心方法 \\& 极简示例\n\n### 1\\. add \\(\\) 缓存对象\n\n```python\n# 纯原生SQLAlchemy写法\nuser = User(account=\"test\", password=\"123\")\nsession.add(user)  # 仅存入内存，数据库无数据\n```\n\n### 2\\. commit \\(\\) 提交事务\n\n```python\nsession.commit() # 执行INSERT，数据持久化到库\n```\n\n### 3\\. refresh \\(\\) 同步数据库最新数据\n\n数据库内部自动更新字段（存储过程 / 触发器），内存对象不会自动刷新，需手动拉取：\n\n```python\nsession.refresh(user)\n```\n\n### 4\\. execute \\(\\) 执行原生 SQL\n\n```python\nstmt = text(\"CALL calc_cal(:uid)\")\nsession.execute(stmt, {\"uid\": user.id})\nsession.commit()\n```\n\n### 5\\. rollback \\(\\) 事务回滚\n\n提交前报错，撤销全部未缓存操作：\n\n```python\ntry:\n    session.add(user)\n    session.commit()\nexcept Exception:\n    session.rollback()\n```\n\n## 事务 ACID 简要说明\n\n原子性：一批操作全成功 / 全撤销\n隔离性：多个 Session 互相不可见未提交数据\n一致性：数据始终符合表约束\n持久性：commit 后数据永久保存',0,1,'2026-07-03 05:42:34.477','2026-07-07 07:35:31.402',4),(54,'ORM','## 核心原理\n\nORM = 对象关系映射，建立「Python 类 ↔ 数据库表」「类实例 ↔ 表行数据」映射，用面向对象操作替代手写基础 SQL。\n\n## 极简示例\n\n### 1\\. 定义映射模型\n\n```python\nfrom sqlalchemy.orm import DeclarativeBase\nfrom sqlalchemy import Integer, String\n\nclass Base(DeclarativeBase)\nclass User(Base):\n    __tablename__ = \"user\"\n    id = Integer(primary_key=True)\n    account = String(50)\n```\n\n### 2\\. 对象增查（无需写 SELECT/INSERT）\n\n```python\n# 新增\nuser = User(account=\"zhangsan\")\nsession.add(user)\n# 查询\nres = session.query(User).filter(User.account == \"zhangsan\").first()\n```\n\n## 特点\n\n1. 自动防 SQL 注入；\n\n2. 复杂存储过程、多表统计仍需搭配 Core 原生 SQL；\n\n3. 可通过`FetchedValue()`标记数据库自动生成字段，禁止 ORM 写入。\n<!-- qm-links:[{\"title\":\"Core\",\"annotation\":\"依赖\"}] -->',0,1,'2026-07-03 05:42:39.795','2026-07-07 02:39:22.258',6),(55,'Core','## 核心原理\n\nSQLAlchemy 底层表达式引擎，ORM 依赖 Core 生成标准 SQL；支持手动书写原生 SQL，统一管理数据库语法，兼容 MySQL、PostgreSQL 等多数据库。\n\n## 极简示例\n\n### 1\\. 参数化原生 SQL（防注入）\n\n```python\nfrom sqlalchemy import text\n# :uid 为Core标准占位符\nsql = text(\"SELECT * FROM user WHERE id = :uid\")\nrow = session.execute(sql, {\"uid\": 1}).fetchone()\n```\n\n### 2\\. ORM 底层自动生成 SQL\n\n```python\nsession.query(User).filter(User.account == \"test\")\n# Core自动翻译成：SELECT user.id, user.account FROM user WHERE user.account = \'test\'\n```\n\n## 作用\n\n统一 SQL 语法、参数转义、多数据库适配、支撑 ORM 上层功能。',0,1,'2026-07-03 05:42:48.754','2026-07-07 02:39:22.265',7),(56,'连接池','## 核心原理\n\nCore 内置连接管理器，预先创建一批数据库 TCP 连接缓存复用，避免频繁创建销毁连接带来的性能损耗；限制最大并发连接，保护数据库。\n\n## 极简示例\n\n```python\n# 创建引擎时配置连接池（原生SQLAlchemy）\nfrom sqlalchemy import create_engine\n# pool_size：常驻连接数；max_overflow：临时扩容最大连接\nengine = create_engine(\"mysql+pymysql://user:pwd@127.0.0.1:3306/db\",\n                       pool_size=10, max_overflow=20)\n```\n\n## 运行逻辑\n\n1. 发起查询时，优先从池内取空闲连接；\n\n2. 使用完毕归还池子，不直接关闭；\n\n3. 超出上限请求排队等待空闲连接，防止数据库连接打爆。',0,1,'2026-07-03 05:42:56.316','2026-07-07 02:39:22.286',11),(57,'单词','鉴别（authentication）\n授权（authorization\n<!-- qm-links:[{\"title\":\"request\",\"annotation\":\"\"}] -->',0,1,'2026-07-03 06:02:57.196','2026-07-06 10:11:02.511',0),(58,'jsonify','## 自动将字典转为 JSON 响应，自动添加 Content-Type: application/json。\n- 正常成功返回\n> return jsonify({\n    \"code\": 200,\n    \"msg\": \"操作成功\",\n    \"data\": 列表/对象.to_dict()\n})\n- 错误返回 + HTTP 状态码\n> return jsonify({\"code\": 401, \"msg\": \"账号密码错误\"}), 401',0,1,'2026-07-03 07:24:04.399','2026-07-07 02:39:22.281',10),(59,'request','request.args：获取 GET 地址栏参数（如?id=1）\nrequest.get_json()：获取 POST 提交的 JSON 请求体\n可拿请求头、表单、上传文件等信息。\n<!-- qm-links:[{\"title\":\"单词\",\"annotation\":\"\"}] -->',0,1,'2026-07-03 07:24:05.012','2026-07-07 02:39:22.238',3),(60,'requirement.txt','## 作用\n用来记录项目所有依赖的 Python 第三方库以及固定版本号，方便一键安装环境、多人协作、服务器部署。\n## 每行格式说明\n库名==版本号，锁定版本，避免不同环境版本不一致导致报错：\n> lask==3.1.0               # Web框架主体\nflask-sqlalchemy==3.1.1    # Flask ORM数据库操作\nflask-cors==5.0.1          # 解决前后端跨域\npymysql==1.1.1             # MySQL连接驱动\npython-dotenv==1.1.0       # 读取.env配置文件（你上面那段Config用到的）\nopenai==1.68.2             # 调用AI大模型接口\n## 使用命令\n### 安装全部依赖（项目根目录执行）\npip install -r requirements.txt\n### 如果你本地装好环境，导出当前所有依赖生成这个文件\npip freeze > requirements.txt',0,1,'2026-07-05 11:25:51.128','2026-07-07 02:39:22.275',9),(61,'上下文','## 应用上下文（App Context）\n绑定 app 实例，存放全局应用资源：current_app、g、db、配置信息\n- 保存内容：current_app（当前 flask 实例）、g（单次上下文全局临时变量）\n- 自动触发：处理接口请求时自动创建；非请求场景不会自动生成\n- 手动开启：with app.app_context():\n适用场景：项目启动建表、命令行操作数据库、脚本单独操作 ORM\n- 报错场景：直接执行 db.create_all() / 查询数据库，无上下文会抛出 RuntimeError: Working outside of application context\n## 请求上下文（Request Context）\n前端发起 HTTP 请求时自动生成，单次请求生命周期有效：request、session\n- 保存内容：request（前端请求数据：参数、header、body）、session（用户会话）\n- 自动触发：浏览器访问接口瞬间自动创建，接口执行完毕自动销毁\n- 生命周期：一次 HTTP 请求 = 一个请求上下文\n- 特点：只在路由函数内部可用，脚本、初始化代码里直接用会报错',0,1,'2026-07-05 11:48:54.722','2026-07-07 02:39:22.270',8),(62,'async / await','## 二.async / await 知识点\n\n### 1. async\n1. 作用：标记一个函数为**异步函数**；\n2. 硬性规则：函数内部想写 `await`，函数头部必须加 `async`；\n3. 特性：无论return什么，async函数最终都会包装成Promise返回。\n\n### 2. await\n1. 作用：等待一个Promise异步操作执行完成，取出最终结果赋值给变量；\n2. 使用范围：**只能写在带async标记的函数内部**，普通函数直接写await会语法报错；\n3. 阻塞范围：仅暂停当前async函数内部代码，**不会阻塞全局页面渲染**，页面不会卡死；\n4. 适用场景：所有异步操作（fetch请求、文件读取、定时器封装）。\n\n### 3. 错误捕获规范\n异步代码报错无法用普通if捕获，必须搭配 `try/catch`：\n```js\nasync request() {\n  try {\n    const res = await fetch(xxx)\n  } catch (err) {\n    // 捕获网络级错误：后端没开、跨域、断网\n  }\n}\n```\n\n## 三、fetch + await 组合执行逻辑（异步核心体现）\n1. `fetch` 调用后立刻发起网络请求，JS主线程不会等待，继续执行外部代码；\n2. `await` 会暂停当前async函数内后续代码，卡在当前行；\n3. 等待浏览器收到后端响应、Promise状态变为完成；\n4. 将Response对象赋值给变量，再执行函数内剩余代码；\n5. 外层其他代码不受await影响，正常同步执行。\n\n### 异步直观示例\n```js\nasync fn() {\n  console.log(\'1.发起请求\')\n  const res = await fetch(\'/api/login\') // 函数内部暂停等待\n  console.log(\'3.请求结束\')\n}\nfn()\nconsole.log(\'2.直接执行，不等接口\')\n// 打印顺序：1 → 2 → 3，完美体现异步\n```\n\n## 四、配套关联知识点（你的API代码用到）\n1. JSON处理：`JSON.stringify()` 将JS对象转为字符串，放到fetch的body中传给后端；\n2. URLSearchParams：拼接GET接口查询参数；\n3. 模块化导出：封装api请求统一导出，页面导入调用；\n4. 前后端交互规范：统一捕获所有异常，返回固定格式 `{code, msg}`，页面无需区分报错类型。\n\n## 五、极简记忆口诀\n1. fetch：浏览器发请求，返回Promise，404/500不算网络错误；\n2. async：函数前缀标记，内部才能写await；\n3. await：等Promise结束拿结果，仅限async函数内使用；\n4. 组合用法：发接口必写 `async + await + try/catch`。\n<!-- qm-links:[{\"title\":\"fetch\",\"annotation\":\"\"}] -->',0,1,'2026-07-06 07:02:17.601','2026-07-07 05:25:42.181',0),(63,'fetch','## 一.fetch 知识点\n\n### 1. 基础定义\n1. `fetch` 是**浏览器原生WebAPI**，不属于JavaScript语法，用来发送HTTP网络请求，替代老旧AJAX（XMLHttpRequest）。\n2. 语法：`fetch(url, [options])`\n   - 参数1：请求完整地址；\n   - 参数2：可选配置对象（请求方式method、请求头headers、请求体body）。\n3. 返回值：永远返回一个 **Promise**，天然异步。\n\n### 2. 核心配置 options\n```js\n{\n  method: \'GET/POST/PUT/DELETE\',\n  headers: { \'Content-Type\': \'application/json\' }, // 告诉后端传JSON\n  body: JSON.stringify(对象) // POST/PUT专用，GET不能带body\n}\n```\n\n### 3. 返回值 Response 响应对象（代码里的res）\n`await fetch()` 拿到的 `res` 是响应实例，常用方法/属性：\n1. `res.status`：HTTP状态码（200成功、404接口不存在、500服务器报错）\n2. `res.headers.get(\'content-type\')`：获取后端返回的数据格式\n3. `await res.json()`：异步解析后端JSON，转为JS对象（必须加await）\n4. `await res.text()`：异步读取纯文本/HTML报错页面\n\n### 4. 关键坑点（你代码专门做了兼容）\n1. `fetch 只有网络完全失败才会进catch`：\n   后端返回404/500不会触发报错，只有断网、后端未启动、跨域拦截才会捕获异常；\n2. GET 请求不允许携带 body，参数只能拼接在URL后面；\n3. 所有读取响应体的操作（json()/text()）都是异步，必须搭配await。',0,1,'2026-07-06 07:48:44.516','2026-07-07 07:35:30.197',2),(64,'Vue Router','# Vue Router 常用方法速记\n\n## 1. 核心概念区分\n- **router**（导航仪）：负责**控制跳转**（如 `useRouter()`）。\n- **route**（仪表盘）：负责**获取当前页面信息**（如 `useRoute()`）。\n\n## 2. 常用跳转方法\n- **`router.push(path)`**：正常跳转。会留下历史记录，用户可点击浏览器“后退”返回。\n- **`router.replace(path)`**：替换跳转。不留历史记录，用户无法“后退”回当前页（常用于登录成功后跳转）。\n- **`router.back()`**：返回上一页（等同于 `router.go(-1)`）。\n- **`router.go(n)`**：在历史记录中前进或后退 `n` 步。\n\n## 3. 传参方式对比\n- **query 参数**：\n  - 写法：`router.push({ path: \'/search\', query: { id: 1 } })`\n  - URL：`/search?id=1`\n  - 特点：刷新不丢失，无需在路由表中提前配置。\n- **params 参数**：\n  - 写法：`router.push({ name: \'User\', params: { id: 1 } })`\n  - URL：`/user/1`\n  - 特点：**必须**配合路由 `name` 使用，**必须**在路由表中配置 `path: \'/user/:id\'`。\n\n## 4. 避坑指南\n- `params` 传参时，绝对不能和 `path` 一起用，只能用 `name`。\n- 编程式导航建议加 `.catch()` 捕获异常，防止重复点击报错。',0,1,'2026-07-06 10:03:50.412','2026-07-07 02:39:22.225',1),(65,'quickMark问题','- 对于行内代码，列表有问题；对于重新开始编排的序号，鼠标放在第一个序号上时，可以选择与上面的序号合并，从上面的序号最后一个继续下去。\n- 对于框选的文字，如果有无序序号，按有序序号图标可以切换为有序序号，如果有有序序号，按无序序号图标可以切换为无序序号',0,1,'2026-07-06 10:12:23.869','2026-07-08 09:54:14.200',0),(67,'query','SQLAlchemy 的 query.filter() 是链式叠加、且关系（AND）\n每调用一次 .filter()，不是覆盖旧条件，而是新增一条同时满足的约束',0,1,'2026-07-07 06:19:11.517','2026-07-07 07:35:21.197',0),(68,'生命钩子','# Vue3 <script setup> Composition API 生命周期钩子\n## 一、基础通用规则\n1. 所有生命周期函数必须从 `vue` 包导入才能使用；\n2. 生命周期钩子只能写在 `<script setup>` 顶层同步代码，不能嵌套在函数、定时器、异步内部；\n3. 组件生命周期分为四大阶段：创建阶段 → 挂载阶段 → 更新阶段 → 销毁阶段；\n4. Composition API 生命周期统一以 `on` 作为前缀，与 Options API 一一对应；\n5. `<script setup>` 语法本身执行时机等价于 Options API 的 `created`，因此 `onCreated/onBeforeCreate` 几乎不会手动使用。\n## 二、生命周期完整执行顺序\n1. 挂载阶段\n    - `onBeforeMount`：DOM 生成、挂载到页面之前触发\n    - `onMounted`：DOM 完全渲染并挂载页面（业务最高频钩子）\n2. 更新阶段（响应式数据发生变化时触发）\n    - `onBeforeUpdate`：DOM 重新渲染更新前触发\n    - `onUpdated`：DOM 更新渲染完成后触发\n3. 销毁阶段（路由离开/组件销毁时触发）\n    - `onBeforeUnmount`：组件销毁前，DOM 仍存在\n    - `onUnmounted`：组件完全销毁，DOM 从页面移除\n\n## 三、各生命周期钩子详解、代码示例、业务场景\n### 1. onBeforeMount 挂载前\n#### 导入语法\n```js\nimport { onBeforeMount } from \'vue\'',0,1,'2026-07-07 07:34:57.392','2026-07-07 07:54:38.098',0),(69,'前后端分离VS不分离','## 判断标准： 后端有没有把HTML页面拼好再发给浏览器。\n\n### <qm-mark color=\"#ffeb3b\">不分离</qm-mark>：后端代码里夹杂着HTML标签，服务器拼好完整页面再吐给浏览器。\n\n### <qm-mark color=\"#ffeb3b\">分离</qm-mark>：后端只吐JSON数据，前端自己把数据渲染成HTML。',0,1,'2026-07-07 07:54:51.833','2026-07-07 07:56:04.875',0),(70,'新笔记','',0,1,'2026-07-07 08:17:55.586','2026-07-07 08:17:56.661',0),(71,'计算属性computed','## 1. 本质\n带缓存的派生值，依赖响应式数据，依赖不变不重复执行。\n## 2. 两种写法\n- 只读（常用）\n```\nconst total = computed(() => 计算并return值)\n```\n- 可读写（get/set）\n```\nconst num = computed({get(){}, set(val){}})\n```\n## 3. 特点\n有缓存，比 methods 性能好\n自动收集依赖，数据变自动重算\n内部不能写异步逻辑\n## 4. 适用场景\n求和、过滤、格式化、多变量组合计算\n',0,1,'2026-07-07 08:18:18.667','2026-07-07 08:29:46.006',0),(72,'reduce()','**核心作用**\n将数组中的多个元素，通过一个自定义的函数，逐步“归约”成一个单一的值（比如一个数字、一个对象、甚至是一个新的数组）。\n> const result = array.reduce((accumulator, currentValue, index, array) => {\n  // 处理逻辑，必须返回 accumulator 的下一个值\n  return accumulator + currentValue;\n}, initialValue); // 初始值（可选，但强烈建议提供）\n\n参数解析：\n1. accumulator (累加器)：上一次回调函数返回的结果。如果是第一次执行且提供了 initialValue，它就是 initialValue。\n2. currentValue (当前值)：当前正在处理的数组元素。\n3. initialValue (初始值)：累加器的初始状态。如果不提供，accumulator 会默认取数组的第一个元素，currentValue 从第二个元素开始。',0,1,'2026-07-07 08:29:58.035','2026-07-08 05:28:26.227',0),(73,'数组操作','# Vue3 ref 数组操作核心知识点总结\n## 一、基础概念\n1. `const details = ref([])`\n   - `details`：ref 包装对象，不是原生数组，不能直接调用数组方法\n   - `details.value`：取出底层真实数组，**读写、修改数组都必须加 .value**\n2. reactive 对比：`const arr = reactive([])`，无需 `.value`，直接 `arr.push()`\n\n## 二、读取数组（不修改原数组）\n1. 遍历求和：`reduce`\n```js\nconst totalCal = computed(() => details.value.reduce((sum, item) => sum + item.cal, 0))\n```\n2. 其他只读方法：`filter`/`map`/`find`/`forEach`，都要先 `.value` 获取数组\n\n## 三、原地修改数组（直接改原数组，Vue自动响应）\n全部基于 `details.value.xxx()` 调用\n1. 末尾新增：`push()`\n```js\ndetails.value.push({ recipe_id, name, weight, cal })\n```\n2. 删除最后一项：`pop()`\n```js\ndetails.value.pop()\n```\n3. 任意位置增删替换：`splice(起始索引, 删除数量)`\n- 删除下标index一条：`details.value.splice(index, 1)`\n- 清空整个数组：`details.value.splice(0)`\n\n## 四、直接覆盖数组（赋值替换）\n直接给 `.value` 赋新数组，覆盖旧数组\n```js\n// 清空\ndetails.value = []\n// 过滤赋值\ndetails.value = details.value.filter(item => item.cal > 100)\n```\n\n## 五、高频易错点\n1. 错误写法：`details.push()` （ref对象不是数组，报错）\n2. 正确写法：`details.value.push()`\n3. `reduce` / `push` 两处都写 `.value`，不是写法不一样，是**操作同一个底层数组**；区别只在一个只读、一个修改。\n\n## 六、常用明细配套函数速记\n1. 添加条目：push\n2. 删除单条：splice(index, 1)\n3. 删除最后一条：pop\n4. 清空全部：value = [] 或 splice(0)\n5. 计算总和：reduce 配合 computed',0,1,'2026-07-08 06:14:48.034','2026-07-08 06:54:38.662',0),(74,'food问题','1. 我需要你把不必要的数据删去\n2. 设置样式改进，现在都是在左边\n\n\n`',0,1,'2026-07-08 08:01:19.218','2026-07-12 07:04:35.235',0),(75,'数组解构赋值','## const [f, c] = ... —— 数组解构赋值\n作用：Promise.all 返回的结果是一个数组，数组元素的顺序和传入的顺序严格一致。\n## 对应关系：\nf 对应数组的第 1 项，也就是 api.getFoods(params) 的返回值（食材列表数据）。\nc 对应数组的第 2 项，也就是 api.getFoodCategories() 的返回值（分类列表数据）。\n\n**优势**：这是一种优雅的语法糖。如果不使用解构，代码只能写成 const results = await Promise.all(...)，然后后续必须用 results[0] 和 results[1] 来获取数据，这样不仅繁琐，而且可读性很差。',0,1,'2026-07-08 08:18:07.906','2026-07-08 08:18:32.523',0),(76,'IntersectionObserver','# 观察器\n## 作用：自动监控多个区块有没有进入你设定的可视判定区域；监听 DOM 元素是否进入可视区域，实现滚动联动、懒加载、埋点等。\n对比 scroll 监听：浏览器原生优化，仅元素进出可视区触发回调，性能远更高，无频繁执行卡顿。\n## 核心参数\n回调 entries：批量返回所有发生变化的被监听元素；isIntersecting 判断是否进入可视判定区。\nrootMargin：裁剪 / 扩大可视判定框，负数向内缩小，格式：上 右 下 左。\nthreshold：元素可见比例达到该值触发回调，0 = 露出一点就触发。\n## 常用方法\nobserve(el)：绑定监听某个 DOM\nunobserve(el)：取消单个监听\ndisconnect()：清空全部监听\n你的业务用法：裁剪出页面顶部窄判定区，滚动时自动匹配当前区块，同步侧边菜单高亮。',0,1,'2026-07-12 07:05:02.187','2026-07-12 07:11:25.404',0),(77,'新课改的教育观','![粘贴图片](/uploads/mrlukw9c-m51h7b.png)',0,1,'2026-07-15 08:49:26.001','2026-07-16 01:39:53.201',0),(78,'素质教育的内涵','1. ![粘贴图片](/uploads/mrludhuc-pb0ini.png)\n2. ![粘贴图片](/uploads/mrluhcm0-3e19te.png)\n3. ![粘贴图片](/uploads/mrluhu4i-ea3so7.png)\n4. ![粘贴图片](/uploads/mrlui4mi-henwh3.png)\n5. ![粘贴图片](/uploads/mrluiv2g-qb5xfv.png)',0,1,'2026-07-15 08:52:02.647','2026-07-16 01:55:00.130',0),(79,'以人为本的学生观','1. ![粘贴图片](/uploads/mrluze1j-q998l4.png)\n2. ![粘贴图片](/uploads/mrlv6xqd-1sr5wr.png)\n3. ![粘贴图片](/uploads/mrlvdk6o-mzc46m.png)\n4. ![粘贴图片](/uploads/mrlvt1h3-gukrdz.png)',0,1,'2026-07-15 09:07:04.193','2026-07-16 01:59:42.343',0),(80,'教师职业角色的转变','1. ![粘贴图片](/uploads/mrmsevxt-cg8dyq.png)\n2. ![粘贴图片](/uploads/mrmsps0n-0ie30q.png)',0,1,'2026-07-16 00:45:11.394','2026-07-16 01:44:48.006',0),(81,'教师教学行为的转变','![![粘贴图片](/uploads/mrmsrg00-jufuzx.png)](/uploads/mrmst7u7-6m3ags.png)',0,1,'2026-07-16 00:54:44.848','2026-07-16 01:44:49.865',0),(82,'职业道德','1. ![粘贴图片](/uploads/mrmt28fc-bmxh07.png)\n2. ![粘贴图片](/uploads/mrmtmlv0-lcpsq0.png)\n3. ![粘贴图片](/uploads/mrmtmtj5-oyaya3.png)\n4. ![粘贴图片](/uploads/mrmtqps9-ykkr8b.png)\n5. ![粘贴图片](/uploads/mrmtzqw0-2yifbx.png)\n6. ![粘贴图片](/uploads/mrmu2ce4-l4xdc4.png)',0,1,'2026-07-16 01:03:21.189','2026-07-16 01:47:49.069',0),(83,'新笔记','',0,1,'2026-07-16 03:27:24.458','2026-07-16 03:27:26.110',0),(84,'教育的产生和发展','1. ![粘贴图片](/uploads/mrmy8pgy-hy9inn.png)\n2. ![粘贴图片](/uploads/mrmzssrp-wx1viv.png)\n3. 教育产生的根本原因是人类生存发展的需要\n4. ![粘贴图片](/uploads/mrn00upl-3w95c1.png)\n5. ![粘贴图片](/uploads/mrn0gbgg-eipg1h.png)\n6. ![粘贴图片](/uploads/mrn0ouii-umyghl.png)\n7. ![粘贴图片](/uploads/mrn13mrc-s6mp5d.png)\n8. ![粘贴图片](/uploads/mrn15o4n-ziwkiw.png)\n9. ![粘贴图片](/uploads/mrn1bujz-isc0xc.png)',0,1,'2026-07-16 03:27:35.410','2026-07-16 04:54:49.178',0),(85,'新笔记','',0,1,'2026-07-16 04:10:48.162','2026-07-16 04:10:49.210',0),(86,'material','- MeshNormalMaterial\n- MeshMatcapMaterial\n- MeshDepthMaterial\n- MeshLambertMaterial\n- MeshPhongMaterial\n- MeshToonMaterial(我的世界的效果)\n- MeshStandardMaterial\n![粘贴图片](/uploads/mrw0n47l-r5vbn3.png)\n- MeshPhysicalMaterial\n![粘贴图片](/uploads/mrw0tk5s-8kjtng.png)\n- matcap(github下载)',0,1,'2026-07-22 10:16:09.043','2026-07-22 11:58:49.745',0);
/*!40000 ALTER TABLE `notes` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `users`
--

DROP TABLE IF EXISTS `users`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `users` (
  `id` int NOT NULL AUTO_INCREMENT,
  `username` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `email` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `password_hash` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `display_name` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `role` varchar(20) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'user',
  `is_locked` tinyint(1) NOT NULL DEFAULT '0',
  `created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  UNIQUE KEY `users_username_key` (`username`),
  UNIQUE KEY `users_email_key` (`email`)
) ENGINE=InnoDB AUTO_INCREMENT=6 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `users`
--

LOCK TABLES `users` WRITE;
/*!40000 ALTER TABLE `users` DISABLE KEYS */;
INSERT INTO `users` VALUES (1,'admin',NULL,'$2b$08$vcLLycRyvMf93NOeuTYFhOzpD7OOCYKyV7VXFGFvhBQbTptXStiXu','系统管理员','admin',0,'2026-06-25 19:33:13.327','2026-06-25 19:33:13.327'),(2,'alice',NULL,'$2b$08$udA2fzysXcNjHLvfC8SnSOip5MoalGlC4bfx.7rmZM28/ObOf.38.','Alice','user',0,'2026-06-25 11:44:21.819','2026-06-25 11:44:21.819'),(3,'aaa',NULL,'$2b$08$CuEjmbuvjc.KNAnL2iGkw.QX11hCnEF32AmtHKspwByZZK7qh7RMa','aaa','user',0,'2026-07-02 15:10:29.254','2026-07-02 15:10:29.254'),(4,'gfj',NULL,'$2b$08$25/3Ci3ewHCOYdYVlZ8JU.oOfSbOXtwn.77qOtoJ.VCmmo7cvuzSq','terr','user',0,'2026-07-03 01:21:04.725','2026-07-03 01:21:04.725'),(5,'aaaa',NULL,'$2b$08$JGqxqXiDL.OVrbrEHqQrS.n5JsiyRrlueyi7U1ghoUSNNhy5CNWme','aaaa','user',0,'2026-07-03 02:18:08.984','2026-07-03 02:18:08.984');
/*!40000 ALTER TABLE `users` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Dumping routines for database 'quickmark'
--
/*!40103 SET TIME_ZONE=@OLD_TIME_ZONE */;

/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40014 SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
/*!40111 SET SQL_NOTES=@OLD_SQL_NOTES */;

-- Dump completed on 2026-07-28  6:51:03
