-- MySQL dump 10.13  Distrib 8.0.31, for Win64 (x86_64)
--
-- Host: localhost    Database: quickmark
-- ------------------------------------------------------
-- Server version	8.0.31

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
-- Current Database: `quickmark`
--

CREATE DATABASE /*!32312 IF NOT EXISTS*/ `quickmark` /*!40100 DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci */ /*!80016 DEFAULT ENCRYPTION='N' */;

USE `quickmark`;

--
-- Table structure for table `_prisma_migrations`
--

DROP TABLE IF EXISTS `_prisma_migrations`;
CREATE TABLE `_prisma_migrations` (
  `id` varchar(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `checksum` varchar(64) COLLATE utf8mb4_unicode_ci NOT NULL,
  `finished_at` datetime(3) DEFAULT NULL,
  `migration_name` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `logs` text COLLATE utf8mb4_unicode_ci,
  `rolled_back_at` datetime(3) DEFAULT NULL,
  `started_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `applied_steps_count` int unsigned NOT NULL DEFAULT '0',
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

LOCK TABLES `_prisma_migrations` WRITE;
INSERT INTO `_prisma_migrations` VALUES ('04837a1f-502a-4bd8-8e91-95d11d011ff5','8117eb69a6eacb9dd16934f0d1a51ddfddbdd030711b57d899dc64c42fcf76b3','2026-06-25 11:03:07.740','20260625190300_init','',NULL,'2026-06-25 11:03:07.740',0),('900923c3-baae-4530-89b2-23ce005a8c77','9d3a2b357c8908daca58ffd5795af28dcb869b3dcdf29e8ef692f7a5b480ba12','2026-06-25 11:33:24.238','20260625193000_v3_user_id','',NULL,'2026-06-25 11:33:24.238',0);
UNLOCK TABLES;

--
-- Table structure for table `categories`
--

DROP TABLE IF EXISTS `categories`;
CREATE TABLE `categories` (
  `id` int NOT NULL AUTO_INCREMENT,
  `name` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `parent_id` int DEFAULT NULL,
  `user_id` int NOT NULL,
  `color` varchar(7) COLLATE utf8mb4_unicode_ci DEFAULT '#6366f1',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_parent` (`parent_id`),
  KEY `idx_parent_name` (`parent_id`,`name`),
  KEY `idx_user_id` (`user_id`),
  CONSTRAINT `categories_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_cat_parent` FOREIGN KEY (`parent_id`) REFERENCES `categories` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=20 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

LOCK TABLES `categories` WRITE;
INSERT INTO `categories` VALUES (2,'个人',NULL,1,'#10b981','2026-06-25 05:08:53','2026-06-25 11:33:13'),(3,'学习',NULL,1,'#f59e0b','2026-06-25 05:08:53','2026-06-25 11:33:13'),(4,'灵感',NULL,1,'#8b5cf6','2026-06-25 05:08:53','2026-06-25 11:33:13'),(5,'AI知识',NULL,1,'#6366f1','2026-06-25 05:17:40','2026-06-25 11:33:13'),(6,'零散知识',NULL,1,'#F59E0B','2026-06-25 06:21:05','2026-06-25 11:33:13'),(7,'Python',5,1,'#3B82F6','2026-06-25 07:10:22','2026-06-25 11:33:13'),(8,'LLM',5,1,'#8B5CF6','2026-06-25 07:10:22','2026-06-25 11:33:13'),(11,'AI',6,1,'#5B8DEF','2026-06-25 07:14:23','2026-06-25 11:33:13'),(12,'定律',6,1,'#10B981','2026-06-25 07:14:40','2026-06-25 11:33:13'),(13,'Alice的房间',NULL,2,'#ff0000','2026-06-25 03:44:43','2026-06-25 03:44:43'),(14,'修改验证',NULL,2,'#00ff00','2026-06-25 03:45:15','2026-06-25 03:45:15');
UNLOCK TABLES;

--
-- Table structure for table `note_categories`
--

DROP TABLE IF EXISTS `note_categories`;
CREATE TABLE `note_categories` (
  `note_id` int NOT NULL,
  `category_id` int NOT NULL,
  PRIMARY KEY (`note_id`,`category_id`),
  KEY `category_id` (`category_id`),
  CONSTRAINT `note_categories_ibfk_1` FOREIGN KEY (`note_id`) REFERENCES `notes` (`id`) ON DELETE CASCADE,
  CONSTRAINT `note_categories_ibfk_2` FOREIGN KEY (`category_id`) REFERENCES `categories` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

LOCK TABLES `note_categories` WRITE;
INSERT INTO `note_categories` VALUES (22,2),(16,11),(20,11),(17,12),(29,12);
UNLOCK TABLES;

--
-- Table structure for table `notes`
--

DROP TABLE IF EXISTS `notes`;
CREATE TABLE `notes` (
  `id` int NOT NULL AUTO_INCREMENT,
  `title` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `content` text COLLATE utf8mb4_unicode_ci,
  `is_pinned` tinyint(1) DEFAULT '0',
  `user_id` int NOT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_user_id` (`user_id`),
  FULLTEXT KEY `ft_title_content` (`title`,`content`),
  CONSTRAINT `notes_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=52 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

LOCK TABLES `notes` WRITE;
INSERT INTO `notes` VALUES (10,'新笔记','',0,1,'2026-06-25 06:12:22','2026-06-25 11:33:13'),(11,'新笔记','',0,1,'2026-06-25 06:12:23','2026-06-25 11:33:13'),(16,'RLHF','<span style="--tw-border-spacing-y: 0; --tw-translate-x: 0; --tw-translate-y: 0; --tw-rotate: 0; --tw-skew-x: 0; --tw-skew-y: 0; --tw-scale-x: 1; --tw-scale-y: 1; --tw-pan-x: ; --tw-pan-y: ; --tw-pinch-zoom: ; --tw-scroll-snap-strictness: proximity; --tw-gradient-from-position: ; --tw-gradient-via-position: ; --tw-gradient-to-position: ; --tw-ordinal: ; --tw-slashed-zero: ; --tw-numeric-figure: ; --tw-numeric-spacing: ; --tw-numeric-fraction: ; --tw-ring-inset: ; --tw-ring-offset-width: 0px; --tw-ring-offset-color: #fff; --tw-ring-color: rgb(59 130 246 / 0.5); --tw-ring-offset-shadow: 0 0 #0000; --tw-ring-shadow: 0 0 #0000; --tw-shadow: 0 0 #0000; --tw-shadow-colored: 0 0 #0000; --tw-blur: ; --tw-brightness: ; --tw-contrast: ; --tw-grayscale: ; --tw-hue-rotate: ; --tw-invert: ; --tw-saturate: ; --tw-sepia: ; --tw-drop-shadow: ; --tw-backdrop-blur: ; --tw-backdrop-brightness: ; --tw-backdrop-contrast: ; --tw-backdrop-grayscale: ; --tw-backdrop-hue-rotate: ; --tw-backdrop-invert: ; --tw-backdrop-opacity: ; --tw-backdrop-saturate: ; --tw-backdrop-sepia: ; --tw-contain-size: ; --tw-contain-layout: ; --tw-contain-paint: ; --tw-contain-style: ; text-align: center; white-space: nowrap; font-size: 13px; color: rgb(25, 25, 25);"><b>RLHF</b>（Reinforcement Learning from Human Feedback）是一种结合强化学习与人类反馈的训练方法，用于让AI生成的内容更符合人类期望和价值观。</span>',0,1,'2026-06-25 07:14:25','2026-06-25 11:33:13'),(17,'定律','# 古德哈特定律\n## 古德哈特定律指出：“当一个指标变成目标，它就不再是一个好的指标。”\n### 指标：用来客观衡量、反映真实状况的观测工具、衡量尺度，作用是如实描述现实，本身不带强制考核要求，只做参考、反馈、评估依据。\n### 目标：人为把某一个指标绑定考核、奖惩、任务要求，强制要求达成固定数值，把衡量标准变成必须完成的硬性任务。\n![你好啊](/uploads/mqt8mxyu-8fqcgu.png)\n### 标题1\n',0,1,'2026-06-25 07:14:44','2026-06-25 11:33:13'),(20,'新笔记','<div><span style="color: rgb(15, 17, 21); font-family: quote-cjk-patch, Inter, system-ui, -apple-system, BlinkMacSystemFont, &quot;Segoe UI&quot;, Roboto, Oxygen, Ubuntu, Cantarell, &quot;Open Sans&quot;, &quot;Helvetica Neue&quot;, sans-serif; font-size: 16px; background-color: rgb(255, 255, 255);">代码块</span></div>',0,1,'2026-06-25 08:30:48','2026-06-25 11:33:13'),(22,'个人疑问','### 标题3',0,1,'2026-06-25 08:50:16','2026-06-25 11:33:13'),(29,'updated','auto-generated',0,1,'2026-06-25 11:21:55','2026-06-25 11:33:13'),(34,'csrf-ok','hello',0,1,'2026-06-25 03:44:05','2026-06-25 03:44:05'),(35,'csrf-ok','hello',0,1,'2026-06-25 03:44:10','2026-06-25 03:44:10'),(36,'alice-private','alice secret',0,2,'2026-06-25 03:44:23','2026-06-25 03:44:23'),(37,'alice-private','alice secret',0,2,'2026-06-25 03:44:30','2026-06-25 03:44:30'),(45,'pool-test','x',0,1,'2026-06-25 11:50:21','2026-06-25 11:50:21');
UNLOCK TABLES;

--
-- Table structure for table `users`
--

DROP TABLE IF EXISTS `users`;
CREATE TABLE `users` (
  `id` int NOT NULL AUTO_INCREMENT,
  `username` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `email` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `password_hash` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `display_name` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `role` varchar(20) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'user',
  `is_locked` tinyint(1) NOT NULL DEFAULT '0',
  `created_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updated_at` datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  UNIQUE KEY `users_username_key` (`username`),
  UNIQUE KEY `users_email_key` (`email`)
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

LOCK TABLES `users` WRITE;
INSERT INTO `users` VALUES (1,'admin',NULL,'$2b$08$vcLLycRyvMf93NOeuTYFhOzpD7OOCYKyV7VXFGFvhBQbTptXStiXu','系统管理员','admin',0,'2026-06-25 19:33:13.327','2026-06-25 19:33:13.327'),(2,'alice',NULL,'$2b$08$udA2fzysXcNjHLvfC8SnSOip5MoalGlC4bfx.7rmZM28/ObOf.38.','Alice','user',0,'2026-06-25 11:44:21.819','2026-06-25 11:44:21.819');
UNLOCK TABLES;

/*!40103 SET TIME_ZONE=@OLD_TIME_ZONE */;
/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40014 SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
/*!40111 SET SQL_NOTES=@OLD_SQL_NOTES */;
-- Dump completed on 2026-06-25 20:02:55
