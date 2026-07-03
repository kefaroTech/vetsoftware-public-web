
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
DROP TABLE IF EXISTS `DATABASECHANGELOG`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `DATABASECHANGELOG` (
  `ID` varchar(255) NOT NULL,
  `AUTHOR` varchar(255) NOT NULL,
  `FILENAME` varchar(255) NOT NULL,
  `DATEEXECUTED` datetime NOT NULL,
  `ORDEREXECUTED` int NOT NULL,
  `EXECTYPE` varchar(10) NOT NULL,
  `MD5SUM` varchar(35) DEFAULT NULL,
  `DESCRIPTION` varchar(255) DEFAULT NULL,
  `COMMENTS` varchar(255) DEFAULT NULL,
  `TAG` varchar(255) DEFAULT NULL,
  `LIQUIBASE` varchar(20) DEFAULT NULL,
  `CONTEXTS` varchar(255) DEFAULT NULL,
  `LABELS` varchar(255) DEFAULT NULL,
  `DEPLOYMENT_ID` varchar(10) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `DATABASECHANGELOGLOCK`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `DATABASECHANGELOGLOCK` (
  `ID` int NOT NULL,
  `LOCKED` tinyint NOT NULL,
  `LOCKGRANTED` datetime DEFAULT NULL,
  `LOCKEDBY` varchar(255) DEFAULT NULL,
  PRIMARY KEY (`ID`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `animal_colors`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `animal_colors` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `name` varchar(100) NOT NULL,
  `created_date` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `enabled` tinyint NOT NULL DEFAULT '1',
  PRIMARY KEY (`id`),
  UNIQUE KEY `name` (`name`)
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `animals`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `animals` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `name` varchar(100) NOT NULL,
  `code` varchar(50) NOT NULL,
  `specie_id` bigint NOT NULL,
  `breed_id` bigint NOT NULL,
  `owner_id` bigint NOT NULL,
  `gender` varchar(20) NOT NULL,
  `weight_type` varchar(20) NOT NULL,
  `animal_type` varchar(20) NOT NULL,
  `reproductive_state` varchar(20) NOT NULL,
  `bod` date DEFAULT NULL,
  `weight` int DEFAULT NULL,
  `size` int DEFAULT NULL,
  `deceased` tinyint NOT NULL DEFAULT '0',
  `deceased_date` date DEFAULT NULL,
  `company_id` bigint NOT NULL,
  `created_date` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `color_id` bigint NOT NULL,
  `enabled` tinyint NOT NULL DEFAULT '1',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_animals_company_code` (`company_id`,`code`),
  KEY `fk_animals_breed` (`breed_id`),
  KEY `fk_animals_owner` (`owner_id`),
  KEY `fk_animals_specie` (`specie_id`),
  KEY `fk_animals_color` (`color_id`),
  CONSTRAINT `fk_animals_breed` FOREIGN KEY (`breed_id`) REFERENCES `breeds` (`id`),
  CONSTRAINT `fk_animals_color` FOREIGN KEY (`color_id`) REFERENCES `animal_colors` (`id`),
  CONSTRAINT `fk_animals_company` FOREIGN KEY (`company_id`) REFERENCES `companies` (`id`),
  CONSTRAINT `fk_animals_owner` FOREIGN KEY (`owner_id`) REFERENCES `owners` (`id`),
  CONSTRAINT `fk_animals_specie` FOREIGN KEY (`specie_id`) REFERENCES `species` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=8 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `base_permissions`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `base_permissions` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `name` varchar(100) NOT NULL,
  `code` varchar(50) NOT NULL,
  `sub_module_id` bigint NOT NULL,
  `created_date` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `enabled` tinyint NOT NULL DEFAULT '1',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_base_permissions_code` (`code`),
  KEY `fk_base_permissions_sub_module` (`sub_module_id`),
  CONSTRAINT `fk_base_permissions_sub_module` FOREIGN KEY (`sub_module_id`) REFERENCES `sub_modules` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=106 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `base_role_permissions`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `base_role_permissions` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `base_role_id` bigint NOT NULL,
  `base_permission_id` bigint NOT NULL,
  `created_date` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `enabled` tinyint NOT NULL DEFAULT '1',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_base_role_permissions` (`base_role_id`,`base_permission_id`),
  KEY `fk_base_role_permissions_base_permission` (`base_permission_id`),
  CONSTRAINT `fk_base_role_permissions_base_permission` FOREIGN KEY (`base_permission_id`) REFERENCES `base_permissions` (`id`),
  CONSTRAINT `fk_base_role_permissions_base_role` FOREIGN KEY (`base_role_id`) REFERENCES `base_roles` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=106 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `base_roles`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `base_roles` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `name` varchar(100) NOT NULL,
  `code` varchar(50) NOT NULL,
  `mandatory` tinyint NOT NULL,
  `created_date` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `enabled` tinyint NOT NULL DEFAULT '1',
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `breeds`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `breeds` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `name` varchar(100) NOT NULL,
  `specie_id` bigint NOT NULL,
  `created_date` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `enabled` tinyint NOT NULL DEFAULT '1',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_breeds_specie_name` (`specie_id`,`name`),
  CONSTRAINT `fk_breeds_specie` FOREIGN KEY (`specie_id`) REFERENCES `species` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `cities`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `cities` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `name` varchar(100) NOT NULL,
  `state_id` bigint NOT NULL,
  `created_date` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `enabled` tinyint NOT NULL DEFAULT '1',
  `dane_code` varchar(5) DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_cities_state_name` (`state_id`,`name`),
  CONSTRAINT `fk_cities_state` FOREIGN KEY (`state_id`) REFERENCES `states` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=1030 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `companies`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `companies` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `name` varchar(100) NOT NULL,
  `identifier` varchar(50) NOT NULL,
  `address` varchar(255) DEFAULT NULL,
  `contact_number` varchar(20) DEFAULT NULL,
  `city_id` bigint NOT NULL,
  `membership_id` bigint NOT NULL,
  `created_date` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `enabled` tinyint NOT NULL DEFAULT '1',
  PRIMARY KEY (`id`),
  UNIQUE KEY `identifier` (`identifier`),
  KEY `fk_companies_membership` (`membership_id`),
  KEY `fk_companies_city` (`city_id`),
  CONSTRAINT `fk_companies_city` FOREIGN KEY (`city_id`) REFERENCES `cities` (`id`),
  CONSTRAINT `fk_companies_membership` FOREIGN KEY (`membership_id`) REFERENCES `memberships` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `company_tax_profile_responsibilities`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `company_tax_profile_responsibilities` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `company_tax_profile_id` bigint NOT NULL,
  `code` varchar(10) NOT NULL,
  `created_date` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `enabled` tinyint NOT NULL DEFAULT '1',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_ctp_responsibilities_profile_code` (`company_tax_profile_id`,`code`),
  CONSTRAINT `fk_ctp_responsibilities_profile` FOREIGN KEY (`company_tax_profile_id`) REFERENCES `company_tax_profiles` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `company_tax_profiles`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `company_tax_profiles` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `company_id` bigint NOT NULL,
  `company_document_type` varchar(30) NOT NULL,
  `company_document_id` varchar(20) NOT NULL,
  `company_document_verification_digit` varchar(1) DEFAULT NULL,
  `legal_name` varchar(255) NOT NULL,
  `tax_regime` varchar(30) NOT NULL,
  `fiscal_email` varchar(255) NOT NULL,
  `commercial_name` varchar(150) DEFAULT NULL,
  `economic_activity_id` bigint DEFAULT NULL,
  `created_date` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `enabled` tinyint NOT NULL DEFAULT '1',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_company_tax_profiles_company` (`company_id`),
  KEY `fk_company_tax_profiles_economic_activity` (`economic_activity_id`),
  CONSTRAINT `fk_company_tax_profiles_company` FOREIGN KEY (`company_id`) REFERENCES `companies` (`id`),
  CONSTRAINT `fk_company_tax_profiles_economic_activity` FOREIGN KEY (`economic_activity_id`) REFERENCES `economic_activities` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `consultation_types`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `consultation_types` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `name` varchar(100) NOT NULL,
  `description` varchar(500) NOT NULL,
  `created_date` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `enabled` tinyint NOT NULL DEFAULT '1',
  PRIMARY KEY (`id`),
  UNIQUE KEY `name` (`name`)
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `consultations`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `consultations` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `date` date NOT NULL,
  `consultation_type_id` bigint NOT NULL,
  `anamnesis` varchar(2000) NOT NULL,
  `diagnosis` varchar(2000) NOT NULL,
  `therapeutic_plan` varchar(2000) NOT NULL,
  `diagnosis_plan` varchar(2000) NOT NULL,
  `next_control` date DEFAULT NULL,
  `animal_id` bigint NOT NULL,
  `company_id` bigint NOT NULL,
  `created_date` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `enabled` tinyint NOT NULL DEFAULT '1',
  PRIMARY KEY (`id`),
  KEY `fk_consultations_consultation_type` (`consultation_type_id`),
  KEY `fk_consultations_animal` (`animal_id`),
  KEY `fk_consultations_company` (`company_id`),
  CONSTRAINT `fk_consultations_animal` FOREIGN KEY (`animal_id`) REFERENCES `animals` (`id`),
  CONSTRAINT `fk_consultations_company` FOREIGN KEY (`company_id`) REFERENCES `companies` (`id`),
  CONSTRAINT `fk_consultations_consultation_type` FOREIGN KEY (`consultation_type_id`) REFERENCES `consultation_types` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=8 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `countries`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `countries` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `name` varchar(100) NOT NULL,
  `created_date` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `enabled` tinyint NOT NULL DEFAULT '1',
  PRIMARY KEY (`id`),
  UNIQUE KEY `name` (`name`)
) ENGINE=InnoDB AUTO_INCREMENT=36 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `daycares`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `daycares` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `date` date NOT NULL,
  `start_date` date NOT NULL,
  `end_date` date DEFAULT NULL,
  `type` varchar(30) NOT NULL,
  `objects` varchar(1000) DEFAULT NULL,
  `observations` varchar(2000) DEFAULT NULL,
  `animal_id` bigint NOT NULL,
  `company_id` bigint NOT NULL,
  `created_date` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `enabled` tinyint NOT NULL DEFAULT '1',
  PRIMARY KEY (`id`),
  KEY `fk_daycares_company` (`company_id`),
  KEY `fk_daycares_animal` (`animal_id`),
  CONSTRAINT `fk_daycares_animal` FOREIGN KEY (`animal_id`) REFERENCES `animals` (`id`),
  CONSTRAINT `fk_daycares_company` FOREIGN KEY (`company_id`) REFERENCES `companies` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `debt_open_accounts`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `debt_open_accounts` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `amount` decimal(12,2) NOT NULL,
  `payment_method` varchar(20) NOT NULL,
  `open_account_id` bigint NOT NULL,
  `created_by_id` bigint NOT NULL,
  `created_date` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `enabled` tinyint NOT NULL DEFAULT '1',
  `voided` tinyint NOT NULL DEFAULT '0',
  `voided_by_id` bigint DEFAULT NULL,
  `voided_at` datetime DEFAULT NULL,
  `void_reason` varchar(255) DEFAULT NULL,
  `client_request_id` varchar(36) DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_debt_open_accounts_request` (`open_account_id`,`client_request_id`),
  KEY `fk_debt_open_accounts_created_by` (`created_by_id`),
  KEY `fk_debt_open_accounts_voided_by` (`voided_by_id`),
  CONSTRAINT `fk_debt_open_accounts_created_by` FOREIGN KEY (`created_by_id`) REFERENCES `employees` (`id`),
  CONSTRAINT `fk_debt_open_accounts_open_account` FOREIGN KEY (`open_account_id`) REFERENCES `open_accounts` (`id`),
  CONSTRAINT `fk_debt_open_accounts_voided_by` FOREIGN KEY (`voided_by_id`) REFERENCES `employees` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=17 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `dewormings`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `dewormings` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `date` date NOT NULL,
  `last_deworming` date DEFAULT NULL,
  `type` varchar(20) NOT NULL,
  `product` varchar(200) NOT NULL,
  `dosage` varchar(200) NOT NULL,
  `next_control` date DEFAULT NULL,
  `observations` varchar(2000) DEFAULT NULL,
  `animal_id` bigint NOT NULL,
  `company_id` bigint NOT NULL,
  `created_date` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `consultation_id` bigint DEFAULT NULL,
  `enabled` tinyint NOT NULL DEFAULT '1',
  PRIMARY KEY (`id`),
  KEY `fk_dewormings_company` (`company_id`),
  KEY `fk_dewormings_animal` (`animal_id`),
  KEY `fk_dewormings_consultation` (`consultation_id`),
  CONSTRAINT `fk_dewormings_animal` FOREIGN KEY (`animal_id`) REFERENCES `animals` (`id`),
  CONSTRAINT `fk_dewormings_company` FOREIGN KEY (`company_id`) REFERENCES `companies` (`id`),
  CONSTRAINT `fk_dewormings_consultation` FOREIGN KEY (`consultation_id`) REFERENCES `consultations` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=4 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `diagnostic_imaging_types`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `diagnostic_imaging_types` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `name` varchar(100) NOT NULL,
  `description` varchar(500) NOT NULL,
  `created_date` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `company_id` bigint DEFAULT NULL,
  `general` tinyint NOT NULL DEFAULT '0',
  `enabled` tinyint NOT NULL DEFAULT '1',
  PRIMARY KEY (`id`),
  UNIQUE KEY `name` (`name`),
  KEY `fk_diagnostic_imaging_types_company` (`company_id`),
  CONSTRAINT `fk_diagnostic_imaging_types_company` FOREIGN KEY (`company_id`) REFERENCES `companies` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `diagnostic_imagings`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `diagnostic_imagings` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `date` date NOT NULL,
  `diagnostic_imaging_type_id` bigint NOT NULL,
  `clinical_signs` varchar(2000) NOT NULL,
  `study_type` varchar(200) NOT NULL,
  `diagnosis` varchar(2000) NOT NULL,
  `observations` varchar(2000) DEFAULT NULL,
  `animal_id` bigint NOT NULL,
  `consultation_id` bigint DEFAULT NULL,
  `company_id` bigint NOT NULL,
  `created_date` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `status` varchar(20) NOT NULL DEFAULT 'PENDIENTE',
  `enabled` tinyint NOT NULL DEFAULT '1',
  PRIMARY KEY (`id`),
  KEY `fk_diagnostic_imagings_consultation` (`consultation_id`),
  KEY `fk_diagnostic_imagings_company` (`company_id`),
  KEY `fk_diagnostic_imagings_type` (`diagnostic_imaging_type_id`),
  KEY `fk_diagnostic_imagings_animal` (`animal_id`),
  CONSTRAINT `fk_diagnostic_imagings_animal` FOREIGN KEY (`animal_id`) REFERENCES `animals` (`id`),
  CONSTRAINT `fk_diagnostic_imagings_company` FOREIGN KEY (`company_id`) REFERENCES `companies` (`id`),
  CONSTRAINT `fk_diagnostic_imagings_consultation` FOREIGN KEY (`consultation_id`) REFERENCES `consultations` (`id`),
  CONSTRAINT `fk_diagnostic_imagings_type` FOREIGN KEY (`diagnostic_imaging_type_id`) REFERENCES `diagnostic_imaging_types` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=5 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `dian_provider_configs`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `dian_provider_configs` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `company_id` bigint NOT NULL,
  `provider` varchar(20) NOT NULL,
  `base_url` varchar(255) NOT NULL,
  `credential_client_id` varchar(512) DEFAULT NULL,
  `credential_client_secret` varchar(512) DEFAULT NULL,
  `credential_username` varchar(512) DEFAULT NULL,
  `credential_password` varchar(512) DEFAULT NULL,
  `api_token` varchar(2000) DEFAULT NULL,
  `webhook_secret` varchar(512) DEFAULT NULL,
  `access_token` varchar(2000) DEFAULT NULL,
  `token_expires_at` datetime DEFAULT NULL,
  `numbering_provider_ref` varchar(100) DEFAULT NULL,
  `created_date` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `enabled` tinyint NOT NULL DEFAULT '1',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_dian_provider_configs_company` (`company_id`),
  CONSTRAINT `fk_dian_provider_configs_company` FOREIGN KEY (`company_id`) REFERENCES `companies` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `economic_activities`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `economic_activities` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `code` varchar(20) NOT NULL,
  `name` varchar(150) NOT NULL,
  `created_date` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `enabled` tinyint NOT NULL DEFAULT '1',
  PRIMARY KEY (`id`),
  UNIQUE KEY `code` (`code`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `electronic_document_lines`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `electronic_document_lines` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `electronic_document_id` bigint NOT NULL,
  `line_number` int NOT NULL,
  `description` varchar(255) NOT NULL,
  `quantity` decimal(12,2) NOT NULL,
  `unit_measure_code` varchar(10) NOT NULL,
  `unit_price` decimal(12,2) NOT NULL,
  `line_extension_amount` decimal(12,2) NOT NULL,
  `tax_category` varchar(20) NOT NULL,
  `tax_scheme` varchar(20) DEFAULT NULL,
  `tax_rate` decimal(5,2) DEFAULT NULL,
  `tax_amount` decimal(12,2) NOT NULL,
  `total_amount` decimal(12,2) NOT NULL,
  PRIMARY KEY (`id`),
  KEY `fk_edoc_lines_document` (`electronic_document_id`),
  CONSTRAINT `fk_edoc_lines_document` FOREIGN KEY (`electronic_document_id`) REFERENCES `electronic_documents` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=52 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `electronic_document_payments`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `electronic_document_payments` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `electronic_document_id` bigint NOT NULL,
  `payment_means` varchar(30) NOT NULL,
  `amount` decimal(12,2) NOT NULL,
  PRIMARY KEY (`id`),
  KEY `fk_edoc_payments_document` (`electronic_document_id`),
  CONSTRAINT `fk_edoc_payments_document` FOREIGN KEY (`electronic_document_id`) REFERENCES `electronic_documents` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=14 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `electronic_document_transmissions`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `electronic_document_transmissions` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `electronic_document_id` bigint NOT NULL,
  `provider` varchar(20) NOT NULL,
  `attempt` int NOT NULL,
  `http_status` int DEFAULT NULL,
  `provider_document_key` varchar(255) DEFAULT NULL,
  `result` varchar(20) NOT NULL,
  `error_message` varchar(2000) DEFAULT NULL,
  `created_date` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `fk_edoc_transmissions_document` (`electronic_document_id`),
  CONSTRAINT `fk_edoc_transmissions_document` FOREIGN KEY (`electronic_document_id`) REFERENCES `electronic_documents` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `electronic_documents`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `electronic_documents` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `company_id` bigint NOT NULL,
  `open_account_id` bigint DEFAULT NULL,
  `document_type` varchar(30) NOT NULL,
  `prefix` varchar(10) DEFAULT NULL,
  `consecutive` bigint DEFAULT NULL,
  `issue_date` date NOT NULL,
  `issue_time` varchar(20) NOT NULL,
  `cufe` varchar(100) DEFAULT NULL,
  `cude` varchar(100) DEFAULT NULL,
  `uuid` varchar(64) DEFAULT NULL,
  `qr_data` varchar(2000) DEFAULT NULL,
  `qr_url` varchar(512) DEFAULT NULL,
  `xml_signed` varchar(2000) DEFAULT NULL,
  `pdf_representation` varchar(512) DEFAULT NULL,
  `dian_status` varchar(20) NOT NULL,
  `dian_validation_date` datetime DEFAULT NULL,
  `issuer_document_type` varchar(30) DEFAULT NULL,
  `issuer_document_id` varchar(20) DEFAULT NULL,
  `issuer_verification_digit` varchar(1) DEFAULT NULL,
  `issuer_legal_name` varchar(255) DEFAULT NULL,
  `issuer_tax_regime` varchar(30) DEFAULT NULL,
  `issuer_email` varchar(255) DEFAULT NULL,
  `customer_document_type` varchar(30) DEFAULT NULL,
  `customer_document_id` varchar(50) DEFAULT NULL,
  `customer_verification_digit` varchar(1) DEFAULT NULL,
  `customer_person_type` varchar(20) DEFAULT NULL,
  `customer_legal_name` varchar(255) DEFAULT NULL,
  `customer_name` varchar(150) DEFAULT NULL,
  `line_extension_amount` decimal(12,2) NOT NULL,
  `tax_exclusive_amount` decimal(12,2) NOT NULL,
  `tax_inclusive_amount` decimal(12,2) NOT NULL,
  `payable_amount` decimal(12,2) NOT NULL,
  `payment_form` varchar(20) NOT NULL,
  `created_date` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `enabled` tinyint NOT NULL DEFAULT '1',
  `customer_email` varchar(150) DEFAULT NULL,
  `referenced_cufe` varchar(100) DEFAULT NULL,
  `referenced_prefix` varchar(10) DEFAULT NULL,
  `referenced_number` bigint DEFAULT NULL,
  `referenced_issue_date` date DEFAULT NULL,
  `note_reason_code` varchar(5) DEFAULT NULL,
  `note_reason_text` varchar(255) DEFAULT NULL,
  `reversed` tinyint NOT NULL DEFAULT '0',
  `rete_fuente_amount` decimal(12,2) NOT NULL DEFAULT '0.00',
  `rete_iva_amount` decimal(12,2) NOT NULL DEFAULT '0.00',
  `rete_ica_amount` decimal(12,2) NOT NULL DEFAULT '0.00',
  `resolution_number` varchar(50) DEFAULT NULL,
  `customer_city_dane` varchar(5) DEFAULT NULL,
  `issuer_responsibilities` varchar(100) DEFAULT NULL,
  `customer_tax_regime` varchar(20) DEFAULT NULL,
  `customer_fiscal_responsibility` varchar(20) DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_electronic_documents_open_account` (`open_account_id`),
  KEY `fk_electronic_documents_company` (`company_id`),
  KEY `idx_electronic_documents_cufe` (`cufe`),
  CONSTRAINT `fk_electronic_documents_company` FOREIGN KEY (`company_id`) REFERENCES `companies` (`id`),
  CONSTRAINT `fk_electronic_documents_open_account` FOREIGN KEY (`open_account_id`) REFERENCES `open_accounts` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=14 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `employee_roles`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `employee_roles` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `employee_id` bigint NOT NULL,
  `role_id` bigint NOT NULL,
  `created_date` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `enabled` tinyint NOT NULL DEFAULT '1',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_employee_roles` (`employee_id`,`role_id`),
  KEY `fk_employee_roles_role` (`role_id`),
  CONSTRAINT `fk_employee_roles_employee` FOREIGN KEY (`employee_id`) REFERENCES `employees` (`id`),
  CONSTRAINT `fk_employee_roles_role` FOREIGN KEY (`role_id`) REFERENCES `roles` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=16 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `employees`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `employees` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `employee_code` varchar(50) NOT NULL,
  `hash_password` varchar(255) NOT NULL,
  `name` varchar(100) NOT NULL,
  `email` varchar(100) NOT NULL,
  `company_id` bigint NOT NULL,
  `created_date` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `enabled` tinyint NOT NULL DEFAULT '1',
  PRIMARY KEY (`id`),
  UNIQUE KEY `employee_code` (`employee_code`),
  KEY `fk_employees_company` (`company_id`),
  CONSTRAINT `fk_employees_company` FOREIGN KEY (`company_id`) REFERENCES `companies` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=9 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `general_charge_open_accounts`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `general_charge_open_accounts` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `name` varchar(150) NOT NULL,
  `unit_amount` decimal(12,2) NOT NULL,
  `quantity` decimal(12,2) NOT NULL,
  `tax_id` bigint DEFAULT NULL,
  `has_tax` tinyint NOT NULL DEFAULT '0',
  `open_account_id` bigint NOT NULL,
  `created_by_id` bigint NOT NULL,
  `created_date` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `enabled` tinyint NOT NULL DEFAULT '1',
  `tax_percentage` decimal(5,2) DEFAULT NULL,
  `voided` tinyint NOT NULL DEFAULT '0',
  `voided_by_id` bigint DEFAULT NULL,
  `voided_at` datetime DEFAULT NULL,
  `void_reason` varchar(255) DEFAULT NULL,
  `base_amount` decimal(12,2) NOT NULL,
  `tax_amount` decimal(12,2) NOT NULL,
  `total_amount` decimal(12,2) NOT NULL,
  `tax_name` varchar(100) DEFAULT NULL,
  `tax_scheme` varchar(10) DEFAULT NULL,
  `client_request_id` varchar(36) DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_general_charge_open_accounts_request` (`open_account_id`,`client_request_id`),
  KEY `fk_general_charge_open_accounts_created_by` (`created_by_id`),
  KEY `fk_general_charge_open_accounts_tax` (`tax_id`),
  KEY `fk_general_charge_open_accounts_voided_by` (`voided_by_id`),
  CONSTRAINT `fk_general_charge_open_accounts_created_by` FOREIGN KEY (`created_by_id`) REFERENCES `employees` (`id`),
  CONSTRAINT `fk_general_charge_open_accounts_open_account` FOREIGN KEY (`open_account_id`) REFERENCES `open_accounts` (`id`),
  CONSTRAINT `fk_general_charge_open_accounts_tax` FOREIGN KEY (`tax_id`) REFERENCES `taxes` (`id`),
  CONSTRAINT `fk_general_charge_open_accounts_voided_by` FOREIGN KEY (`voided_by_id`) REFERENCES `employees` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `hospitalization_medications`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `hospitalization_medications` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `name` varchar(200) NOT NULL,
  `dose` varchar(200) DEFAULT NULL,
  `frequency` varchar(40) DEFAULT NULL,
  `guideline_type` varchar(40) DEFAULT NULL,
  `duration_measure` varchar(40) DEFAULT NULL,
  `duration_quantity` int DEFAULT NULL,
  `start_date` date DEFAULT NULL,
  `start_time` time DEFAULT NULL,
  `notes` varchar(2000) DEFAULT NULL,
  `hospitalization_id` bigint NOT NULL,
  `created_by_id` bigint NOT NULL,
  `created_date` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `enabled` tinyint NOT NULL DEFAULT '1',
  `suspension_date` datetime DEFAULT NULL,
  `suspension_by_id` bigint DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `fk_hosp_medications_hospitalization` (`hospitalization_id`),
  KEY `fk_hosp_medications_created_by` (`created_by_id`),
  KEY `fk_hosp_medications_suspension_by` (`suspension_by_id`),
  CONSTRAINT `fk_hosp_medications_created_by` FOREIGN KEY (`created_by_id`) REFERENCES `employees` (`id`),
  CONSTRAINT `fk_hosp_medications_hospitalization` FOREIGN KEY (`hospitalization_id`) REFERENCES `hospitalizations` (`id`),
  CONSTRAINT `fk_hosp_medications_suspension_by` FOREIGN KEY (`suspension_by_id`) REFERENCES `employees` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=7 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `hospitalization_observations`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `hospitalization_observations` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `description` varchar(2000) NOT NULL,
  `hospitalization_id` bigint NOT NULL,
  `created_by_id` bigint NOT NULL,
  `created_date` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `enabled` tinyint NOT NULL DEFAULT '1',
  PRIMARY KEY (`id`),
  KEY `fk_hosp_observations_hospitalization` (`hospitalization_id`),
  KEY `fk_hosp_observations_created_by` (`created_by_id`),
  CONSTRAINT `fk_hosp_observations_created_by` FOREIGN KEY (`created_by_id`) REFERENCES `employees` (`id`),
  CONSTRAINT `fk_hosp_observations_hospitalization` FOREIGN KEY (`hospitalization_id`) REFERENCES `hospitalizations` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `hospitalization_procedures`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `hospitalization_procedures` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `name` varchar(200) NOT NULL,
  `dose` varchar(200) DEFAULT NULL,
  `frequency` varchar(40) DEFAULT NULL,
  `guideline_type` varchar(40) DEFAULT NULL,
  `duration_measure` varchar(40) DEFAULT NULL,
  `duration_quantity` int DEFAULT NULL,
  `start_date` date DEFAULT NULL,
  `start_time` time DEFAULT NULL,
  `notes` varchar(2000) DEFAULT NULL,
  `hospitalization_id` bigint NOT NULL,
  `created_by_id` bigint NOT NULL,
  `created_date` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `enabled` tinyint NOT NULL DEFAULT '1',
  `suspension_date` datetime DEFAULT NULL,
  `suspension_by_id` bigint DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `fk_hosp_procedures_created_by` (`created_by_id`),
  KEY `fk_hosp_procedures_hospitalization` (`hospitalization_id`),
  KEY `fk_hosp_procedures_suspension_by` (`suspension_by_id`),
  CONSTRAINT `fk_hosp_procedures_created_by` FOREIGN KEY (`created_by_id`) REFERENCES `employees` (`id`),
  CONSTRAINT `fk_hosp_procedures_hospitalization` FOREIGN KEY (`hospitalization_id`) REFERENCES `hospitalizations` (`id`),
  CONSTRAINT `fk_hosp_procedures_suspension_by` FOREIGN KEY (`suspension_by_id`) REFERENCES `employees` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=5 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `hospitalization_progress_notes`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `hospitalization_progress_notes` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `description` varchar(2000) NOT NULL,
  `hospitalization_id` bigint NOT NULL,
  `created_by_id` bigint NOT NULL,
  `created_date` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `enabled` tinyint NOT NULL DEFAULT '1',
  PRIMARY KEY (`id`),
  KEY `fk_hosp_progress_notes_hospitalization` (`hospitalization_id`),
  KEY `fk_hosp_progress_notes_created_by` (`created_by_id`),
  CONSTRAINT `fk_hosp_progress_notes_created_by` FOREIGN KEY (`created_by_id`) REFERENCES `employees` (`id`),
  CONSTRAINT `fk_hosp_progress_notes_hospitalization` FOREIGN KEY (`hospitalization_id`) REFERENCES `hospitalizations` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `hospitalizations`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `hospitalizations` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `date` date NOT NULL,
  `start_date` date NOT NULL,
  `end_date` date DEFAULT NULL,
  `type` varchar(30) NOT NULL,
  `reason_leaving` varchar(30) DEFAULT NULL,
  `reason` varchar(500) NOT NULL,
  `observations` varchar(2000) DEFAULT NULL,
  `animal_id` bigint NOT NULL,
  `company_id` bigint NOT NULL,
  `created_date` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `consultation_id` bigint DEFAULT NULL,
  `enabled` tinyint NOT NULL DEFAULT '1',
  PRIMARY KEY (`id`),
  KEY `fk_hospitalizations_animal` (`animal_id`),
  KEY `fk_hospitalizations_company` (`company_id`),
  KEY `fk_hospitalizations_consultation` (`consultation_id`),
  CONSTRAINT `fk_hospitalizations_animal` FOREIGN KEY (`animal_id`) REFERENCES `animals` (`id`),
  CONSTRAINT `fk_hospitalizations_company` FOREIGN KEY (`company_id`) REFERENCES `companies` (`id`),
  CONSTRAINT `fk_hospitalizations_consultation` FOREIGN KEY (`consultation_id`) REFERENCES `consultations` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=4 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `laboratory_test_files`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `laboratory_test_files` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `storage_key` varchar(512) NOT NULL,
  `bucket` varchar(255) NOT NULL,
  `original_file_name` varchar(255) NOT NULL,
  `content_type` varchar(100) NOT NULL,
  `size_bytes` bigint NOT NULL,
  `e_tag` varchar(255) NOT NULL,
  `uploaded_by_id` bigint NOT NULL,
  `laboratory_test_id` bigint NOT NULL,
  `created_date` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `fk_laboratory_test_files_uploaded_by` (`uploaded_by_id`),
  KEY `fk_laboratory_test_files_laboratory_test` (`laboratory_test_id`),
  CONSTRAINT `fk_laboratory_test_files_laboratory_test` FOREIGN KEY (`laboratory_test_id`) REFERENCES `laboratory_tests` (`id`),
  CONSTRAINT `fk_laboratory_test_files_uploaded_by` FOREIGN KEY (`uploaded_by_id`) REFERENCES `employees` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=4 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `laboratory_test_types`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `laboratory_test_types` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `name` varchar(100) NOT NULL,
  `description` varchar(500) NOT NULL,
  `created_date` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `company_id` bigint DEFAULT NULL,
  `general` tinyint NOT NULL DEFAULT '0',
  `enabled` tinyint NOT NULL DEFAULT '1',
  PRIMARY KEY (`id`),
  UNIQUE KEY `name` (`name`),
  KEY `fk_test_types_company` (`company_id`),
  CONSTRAINT `fk_test_types_company` FOREIGN KEY (`company_id`) REFERENCES `companies` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `laboratory_tests`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `laboratory_tests` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `date` date NOT NULL,
  `test_type_id` bigint NOT NULL,
  `quantity` int NOT NULL,
  `diagnosis` varchar(2000) NOT NULL,
  `animal_id` bigint NOT NULL,
  `company_id` bigint NOT NULL,
  `created_date` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `consultation_id` bigint DEFAULT NULL,
  `status` varchar(50) NOT NULL,
  `enabled` tinyint NOT NULL DEFAULT '1',
  `prioridad` varchar(20) NOT NULL DEFAULT 'NORMAL',
  `processed_by_id` bigint DEFAULT NULL,
  `processed_date` datetime DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `fk_laboratory_tests_company` (`company_id`),
  KEY `fk_laboratory_tests_test_type` (`test_type_id`),
  KEY `fk_laboratory_tests_animal` (`animal_id`),
  KEY `fk_laboratory_tests_consultation` (`consultation_id`),
  KEY `fk_laboratory_tests_processed_by` (`processed_by_id`),
  CONSTRAINT `fk_laboratory_tests_animal` FOREIGN KEY (`animal_id`) REFERENCES `animals` (`id`),
  CONSTRAINT `fk_laboratory_tests_company` FOREIGN KEY (`company_id`) REFERENCES `companies` (`id`),
  CONSTRAINT `fk_laboratory_tests_consultation` FOREIGN KEY (`consultation_id`) REFERENCES `consultations` (`id`),
  CONSTRAINT `fk_laboratory_tests_processed_by` FOREIGN KEY (`processed_by_id`) REFERENCES `employees` (`id`),
  CONSTRAINT `fk_laboratory_tests_test_type` FOREIGN KEY (`test_type_id`) REFERENCES `laboratory_test_types` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=17 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `medicament_prescriptions`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `medicament_prescriptions` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `name` varchar(200) NOT NULL,
  `presentation` varchar(200) NOT NULL,
  `quantity` double NOT NULL,
  `posology` varchar(1000) NOT NULL,
  `prescription_id` bigint NOT NULL,
  `created_date` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `enabled` tinyint NOT NULL DEFAULT '1',
  PRIMARY KEY (`id`),
  KEY `fk_medicament_prescriptions_prescription` (`prescription_id`),
  CONSTRAINT `fk_medicament_prescriptions_prescription` FOREIGN KEY (`prescription_id`) REFERENCES `prescriptions` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=6 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `medication_schedules`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `medication_schedules` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `hospitalization_medication_id` bigint NOT NULL,
  `created_by_id` bigint NOT NULL,
  `original_date_time` datetime DEFAULT NULL,
  `current_date_time` datetime DEFAULT NULL,
  `real_date_time` datetime DEFAULT NULL,
  `applied_status` varchar(40) DEFAULT NULL,
  `rescheduled` tinyint DEFAULT NULL,
  `created_date` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `enabled` tinyint NOT NULL DEFAULT '1',
  PRIMARY KEY (`id`),
  KEY `fk_medication_schedules_medication` (`hospitalization_medication_id`),
  KEY `fk_medication_schedules_created_by` (`created_by_id`),
  CONSTRAINT `fk_medication_schedules_created_by` FOREIGN KEY (`created_by_id`) REFERENCES `employees` (`id`),
  CONSTRAINT `fk_medication_schedules_medication` FOREIGN KEY (`hospitalization_medication_id`) REFERENCES `hospitalization_medications` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=143 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `membership_sub_modules`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `membership_sub_modules` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `membership_id` bigint NOT NULL,
  `sub_module_id` bigint NOT NULL,
  `created_date` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `enabled` tinyint NOT NULL DEFAULT '1',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_membership_sub_modules` (`membership_id`,`sub_module_id`),
  KEY `fk_membership_sub_modules_sub_module` (`sub_module_id`),
  CONSTRAINT `fk_membership_sub_modules_membership` FOREIGN KEY (`membership_id`) REFERENCES `memberships` (`id`),
  CONSTRAINT `fk_membership_sub_modules_sub_module` FOREIGN KEY (`sub_module_id`) REFERENCES `sub_modules` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=29 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `memberships`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `memberships` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `name` varchar(100) NOT NULL,
  `status` varchar(20) NOT NULL,
  `created_date` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `mandatory` tinyint NOT NULL DEFAULT '0',
  `enabled` tinyint NOT NULL DEFAULT '1',
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `modules`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `modules` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `name` varchar(100) NOT NULL,
  `code` varchar(50) NOT NULL,
  `created_date` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `enabled` tinyint NOT NULL DEFAULT '1',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_modules_code` (`code`)
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `numbering_resolutions`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `numbering_resolutions` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `company_id` bigint NOT NULL,
  `document_type` varchar(30) NOT NULL,
  `resolution_number` varchar(50) NOT NULL,
  `resolution_date` date NOT NULL,
  `prefix` varchar(10) DEFAULT NULL,
  `range_from` bigint NOT NULL,
  `range_to` bigint NOT NULL,
  `valid_from` date NOT NULL,
  `valid_to` date NOT NULL,
  `technical_key` varchar(255) DEFAULT NULL,
  `current_number` bigint NOT NULL,
  `created_date` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `enabled` tinyint NOT NULL DEFAULT '1',
  `active_document_type` varchar(30) GENERATED ALWAYS AS ((case when (`enabled` = true) then `document_type` else NULL end)) STORED,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_numbering_resolutions_active` (`company_id`,`active_document_type`),
  CONSTRAINT `fk_numbering_resolutions_company` FOREIGN KEY (`company_id`) REFERENCES `companies` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `open_accounts`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `open_accounts` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `total_amount` decimal(12,2) NOT NULL DEFAULT '0.00',
  `paid_amount` decimal(12,2) NOT NULL DEFAULT '0.00',
  `outstanding_amount` decimal(12,2) NOT NULL DEFAULT '0.00',
  `owner_id` bigint NOT NULL,
  `company_id` bigint NOT NULL,
  `created_by_id` bigint NOT NULL,
  `created_date` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `enabled` tinyint NOT NULL DEFAULT '1',
  `status` varchar(20) NOT NULL DEFAULT 'OPEN',
  `closed_by_id` bigint DEFAULT NULL,
  `closed_at` datetime DEFAULT NULL,
  `close_reason` varchar(255) DEFAULT NULL,
  `version` bigint NOT NULL DEFAULT '0',
  `active_open_owner_id` bigint GENERATED ALWAYS AS ((case when ((`status` = _utf8mb4'OPEN') and (`enabled` = true)) then `owner_id` else NULL end)) STORED,
  `reversed` tinyint NOT NULL DEFAULT '0',
  `reversed_at` datetime DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_open_accounts_active_owner` (`active_open_owner_id`),
  KEY `fk_open_accounts_owner` (`owner_id`),
  KEY `fk_open_accounts_created_by` (`created_by_id`),
  KEY `fk_open_accounts_company` (`company_id`),
  KEY `fk_open_accounts_closed_by` (`closed_by_id`),
  CONSTRAINT `fk_open_accounts_closed_by` FOREIGN KEY (`closed_by_id`) REFERENCES `employees` (`id`),
  CONSTRAINT `fk_open_accounts_company` FOREIGN KEY (`company_id`) REFERENCES `companies` (`id`),
  CONSTRAINT `fk_open_accounts_created_by` FOREIGN KEY (`created_by_id`) REFERENCES `employees` (`id`),
  CONSTRAINT `fk_open_accounts_owner` FOREIGN KEY (`owner_id`) REFERENCES `owners` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=13 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `owners`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `owners` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `name` varchar(150) NOT NULL,
  `email` varchar(150) DEFAULT NULL,
  `document` varchar(50) NOT NULL,
  `address` varchar(255) DEFAULT NULL,
  `phone` varchar(30) DEFAULT NULL,
  `city_id` bigint NOT NULL,
  `company_id` bigint NOT NULL,
  `created_date` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `enabled` tinyint NOT NULL DEFAULT '1',
  `document_type` varchar(30) NOT NULL,
  `person_type` varchar(20) NOT NULL,
  `verification_digit` varchar(1) DEFAULT NULL,
  `legal_name` varchar(255) DEFAULT NULL,
  `withholding_agent` tinyint NOT NULL DEFAULT '0',
  `tax_regime` varchar(20) NOT NULL DEFAULT 'NO_RESPONSABLE_IVA',
  `fiscal_responsibility` varchar(20) NOT NULL DEFAULT 'NO_APLICA',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_owners_company_document` (`company_id`,`document`),
  KEY `fk_owners_city` (`city_id`),
  CONSTRAINT `fk_owners_city` FOREIGN KEY (`city_id`) REFERENCES `cities` (`id`),
  CONSTRAINT `fk_owners_company` FOREIGN KEY (`company_id`) REFERENCES `companies` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=4 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `permissions`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `permissions` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `name` varchar(100) NOT NULL,
  `code` varchar(50) NOT NULL,
  `company_id` bigint NOT NULL,
  `sub_module_id` bigint NOT NULL,
  `created_date` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `enabled` tinyint NOT NULL DEFAULT '1',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_permissions_company_code` (`company_id`,`code`),
  KEY `fk_permissions_sub_module` (`sub_module_id`),
  CONSTRAINT `fk_permissions_company` FOREIGN KEY (`company_id`) REFERENCES `companies` (`id`),
  CONSTRAINT `fk_permissions_sub_module` FOREIGN KEY (`sub_module_id`) REFERENCES `sub_modules` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=215 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `prescriptions`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `prescriptions` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `date` date NOT NULL,
  `diagnosis` varchar(2000) NOT NULL,
  `observations` varchar(2000) DEFAULT NULL,
  `animal_id` bigint NOT NULL,
  `company_id` bigint NOT NULL,
  `created_date` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `consultation_id` bigint NOT NULL,
  `enabled` tinyint NOT NULL DEFAULT '1',
  PRIMARY KEY (`id`),
  KEY `fk_prescriptions_company` (`company_id`),
  KEY `fk_prescriptions_animal` (`animal_id`),
  KEY `fk_prescriptions_consultation` (`consultation_id`),
  CONSTRAINT `fk_prescriptions_animal` FOREIGN KEY (`animal_id`) REFERENCES `animals` (`id`),
  CONSTRAINT `fk_prescriptions_company` FOREIGN KEY (`company_id`) REFERENCES `companies` (`id`),
  CONSTRAINT `fk_prescriptions_consultation` FOREIGN KEY (`consultation_id`) REFERENCES `consultations` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=5 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `procedure_schedules`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `procedure_schedules` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `hospitalization_procedure_id` bigint NOT NULL,
  `created_by_id` bigint NOT NULL,
  `original_date_time` datetime DEFAULT NULL,
  `current_date_time` datetime DEFAULT NULL,
  `real_date_time` datetime DEFAULT NULL,
  `applied_status` varchar(40) DEFAULT NULL,
  `rescheduled` tinyint DEFAULT NULL,
  `created_date` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `enabled` tinyint NOT NULL DEFAULT '1',
  PRIMARY KEY (`id`),
  KEY `fk_procedure_schedules_created_by` (`created_by_id`),
  KEY `fk_procedure_schedules_procedure` (`hospitalization_procedure_id`),
  CONSTRAINT `fk_procedure_schedules_created_by` FOREIGN KEY (`created_by_id`) REFERENCES `employees` (`id`),
  CONSTRAINT `fk_procedure_schedules_procedure` FOREIGN KEY (`hospitalization_procedure_id`) REFERENCES `hospitalization_procedures` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=71 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `product_categories`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `product_categories` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `name` varchar(100) NOT NULL,
  `description` varchar(500) NOT NULL,
  `company_id` bigint NOT NULL,
  `created_date` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `enabled` tinyint NOT NULL DEFAULT '1',
  PRIMARY KEY (`id`),
  KEY `fk_product_categories_company` (`company_id`),
  CONSTRAINT `fk_product_categories_company` FOREIGN KEY (`company_id`) REFERENCES `companies` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `product_charge_open_accounts`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `product_charge_open_accounts` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `animal_id` bigint NOT NULL,
  `product_id` bigint NOT NULL,
  `open_account_id` bigint NOT NULL,
  `created_by_id` bigint NOT NULL,
  `created_date` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `enabled` tinyint NOT NULL DEFAULT '1',
  `unit_price` decimal(12,2) NOT NULL,
  `voided` tinyint NOT NULL DEFAULT '0',
  `voided_by_id` bigint DEFAULT NULL,
  `voided_at` datetime DEFAULT NULL,
  `void_reason` varchar(255) DEFAULT NULL,
  `has_tax` tinyint NOT NULL DEFAULT '0',
  `tax_id` bigint DEFAULT NULL,
  `tax_percentage` decimal(5,2) DEFAULT NULL,
  `tax_name` varchar(100) DEFAULT NULL,
  `base_amount` decimal(12,2) NOT NULL,
  `tax_amount` decimal(12,2) NOT NULL,
  `total_amount` decimal(12,2) NOT NULL,
  `tax_scheme` varchar(10) DEFAULT NULL,
  `client_request_id` varchar(36) DEFAULT NULL,
  `tax_treatment` varchar(20) DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_product_charge_open_accounts_request` (`open_account_id`,`client_request_id`),
  KEY `fk_product_charge_open_accounts_product` (`product_id`),
  KEY `fk_product_charge_open_accounts_animal` (`animal_id`),
  KEY `fk_product_charge_open_accounts_created_by` (`created_by_id`),
  KEY `fk_product_charge_open_accounts_voided_by` (`voided_by_id`),
  KEY `fk_product_charge_open_accounts_tax` (`tax_id`),
  CONSTRAINT `fk_product_charge_open_accounts_animal` FOREIGN KEY (`animal_id`) REFERENCES `animals` (`id`),
  CONSTRAINT `fk_product_charge_open_accounts_created_by` FOREIGN KEY (`created_by_id`) REFERENCES `employees` (`id`),
  CONSTRAINT `fk_product_charge_open_accounts_open_account` FOREIGN KEY (`open_account_id`) REFERENCES `open_accounts` (`id`),
  CONSTRAINT `fk_product_charge_open_accounts_product` FOREIGN KEY (`product_id`) REFERENCES `products` (`id`),
  CONSTRAINT `fk_product_charge_open_accounts_tax` FOREIGN KEY (`tax_id`) REFERENCES `taxes` (`id`),
  CONSTRAINT `fk_product_charge_open_accounts_voided_by` FOREIGN KEY (`voided_by_id`) REFERENCES `employees` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=4 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `products`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `products` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `name` varchar(100) NOT NULL,
  `code` varchar(50) NOT NULL,
  `purchase_price` decimal(12,2) NOT NULL,
  `sale_price` decimal(12,2) NOT NULL,
  `current_stock` int NOT NULL,
  `min_stock` int NOT NULL,
  `provider` varchar(150) DEFAULT NULL,
  `expire_date` tinyint NOT NULL DEFAULT '0',
  `notes` varchar(500) DEFAULT NULL,
  `product_category_id` bigint NOT NULL,
  `tax_id` bigint DEFAULT NULL,
  `company_id` bigint NOT NULL,
  `created_date` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `enabled` tinyint NOT NULL DEFAULT '1',
  `tax_treatment` varchar(20) NOT NULL,
  `active_code` varchar(50) GENERATED ALWAYS AS ((case when (`enabled` = true) then `code` else NULL end)) STORED,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_products_company_active_code` (`company_id`,`active_code`),
  KEY `fk_products_tax` (`tax_id`),
  KEY `fk_products_product_category` (`product_category_id`),
  CONSTRAINT `fk_products_company` FOREIGN KEY (`company_id`) REFERENCES `companies` (`id`),
  CONSTRAINT `fk_products_product_category` FOREIGN KEY (`product_category_id`) REFERENCES `product_categories` (`id`),
  CONSTRAINT `fk_products_tax` FOREIGN KEY (`tax_id`) REFERENCES `taxes` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `promotions`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `promotions` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `name` varchar(100) NOT NULL,
  `promotion_type` varchar(30) NOT NULL,
  `application_type` varchar(30) NOT NULL,
  `application_item` bigint NOT NULL,
  `value_type` varchar(30) NOT NULL,
  `value` decimal(12,2) NOT NULL,
  `start_date` datetime NOT NULL,
  `end_date` datetime NOT NULL,
  `promotion_status` varchar(30) NOT NULL,
  `company_id` bigint NOT NULL,
  `created_date` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `enabled` tinyint NOT NULL DEFAULT '1',
  PRIMARY KEY (`id`),
  KEY `fk_promotions_company` (`company_id`),
  CONSTRAINT `fk_promotions_company` FOREIGN KEY (`company_id`) REFERENCES `companies` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `role_permissions`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `role_permissions` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `role_id` bigint NOT NULL,
  `permission_id` bigint NOT NULL,
  `created_date` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `enabled` tinyint NOT NULL DEFAULT '1',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_role_permissions` (`role_id`,`permission_id`),
  KEY `fk_role_permissions_permission` (`permission_id`),
  CONSTRAINT `fk_role_permissions_permission` FOREIGN KEY (`permission_id`) REFERENCES `permissions` (`id`),
  CONSTRAINT `fk_role_permissions_role` FOREIGN KEY (`role_id`) REFERENCES `roles` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=366 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `roles`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `roles` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `name` varchar(100) NOT NULL,
  `code` varchar(50) NOT NULL,
  `company_id` bigint NOT NULL,
  `created_date` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `enabled` tinyint NOT NULL DEFAULT '1',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_roles_company_code` (`company_id`,`code`),
  CONSTRAINT `fk_roles_company` FOREIGN KEY (`company_id`) REFERENCES `companies` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=6 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `service_categories`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `service_categories` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `name` varchar(100) NOT NULL,
  `description` varchar(500) NOT NULL,
  `company_id` bigint NOT NULL,
  `created_date` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `enabled` tinyint NOT NULL DEFAULT '1',
  PRIMARY KEY (`id`),
  KEY `fk_service_categories_company` (`company_id`),
  CONSTRAINT `fk_service_categories_company` FOREIGN KEY (`company_id`) REFERENCES `companies` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=4 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `service_charge_open_accounts`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `service_charge_open_accounts` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `animal_id` bigint NOT NULL,
  `service_id` bigint NOT NULL,
  `open_account_id` bigint NOT NULL,
  `created_by_id` bigint NOT NULL,
  `created_date` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `enabled` tinyint NOT NULL DEFAULT '1',
  `unit_price` decimal(12,2) NOT NULL,
  `voided` tinyint NOT NULL DEFAULT '0',
  `voided_by_id` bigint DEFAULT NULL,
  `voided_at` datetime DEFAULT NULL,
  `void_reason` varchar(255) DEFAULT NULL,
  `has_tax` tinyint NOT NULL DEFAULT '0',
  `tax_id` bigint DEFAULT NULL,
  `tax_percentage` decimal(5,2) DEFAULT NULL,
  `tax_name` varchar(100) DEFAULT NULL,
  `base_amount` decimal(12,2) NOT NULL,
  `tax_amount` decimal(12,2) NOT NULL,
  `total_amount` decimal(12,2) NOT NULL,
  `tax_scheme` varchar(10) DEFAULT NULL,
  `client_request_id` varchar(36) DEFAULT NULL,
  `tax_treatment` varchar(20) DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_service_charge_open_accounts_request` (`open_account_id`,`client_request_id`),
  KEY `fk_service_charge_open_accounts_created_by` (`created_by_id`),
  KEY `fk_service_charge_open_accounts_service` (`service_id`),
  KEY `fk_service_charge_open_accounts_animal` (`animal_id`),
  KEY `fk_service_charge_open_accounts_voided_by` (`voided_by_id`),
  KEY `fk_service_charge_open_accounts_tax` (`tax_id`),
  CONSTRAINT `fk_service_charge_open_accounts_animal` FOREIGN KEY (`animal_id`) REFERENCES `animals` (`id`),
  CONSTRAINT `fk_service_charge_open_accounts_created_by` FOREIGN KEY (`created_by_id`) REFERENCES `employees` (`id`),
  CONSTRAINT `fk_service_charge_open_accounts_open_account` FOREIGN KEY (`open_account_id`) REFERENCES `open_accounts` (`id`),
  CONSTRAINT `fk_service_charge_open_accounts_service` FOREIGN KEY (`service_id`) REFERENCES `services` (`id`),
  CONSTRAINT `fk_service_charge_open_accounts_tax` FOREIGN KEY (`tax_id`) REFERENCES `taxes` (`id`),
  CONSTRAINT `fk_service_charge_open_accounts_voided_by` FOREIGN KEY (`voided_by_id`) REFERENCES `employees` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=29 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `services`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `services` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `name` varchar(100) NOT NULL,
  `price` decimal(12,2) NOT NULL,
  `notes` varchar(500) DEFAULT NULL,
  `service_category_id` bigint NOT NULL,
  `tax_id` bigint DEFAULT NULL,
  `company_id` bigint NOT NULL,
  `created_date` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `enabled` tinyint NOT NULL DEFAULT '1',
  `tax_treatment` varchar(20) NOT NULL,
  PRIMARY KEY (`id`),
  KEY `fk_services_company` (`company_id`),
  KEY `fk_services_service_category` (`service_category_id`),
  KEY `fk_services_tax` (`tax_id`),
  CONSTRAINT `fk_services_company` FOREIGN KEY (`company_id`) REFERENCES `companies` (`id`),
  CONSTRAINT `fk_services_service_category` FOREIGN KEY (`service_category_id`) REFERENCES `service_categories` (`id`),
  CONSTRAINT `fk_services_tax` FOREIGN KEY (`tax_id`) REFERENCES `taxes` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=6 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `spa_types`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `spa_types` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `name` varchar(100) NOT NULL,
  `description` varchar(500) NOT NULL,
  `created_date` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `enabled` tinyint NOT NULL DEFAULT '1',
  PRIMARY KEY (`id`),
  UNIQUE KEY `name` (`name`)
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `spas`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `spas` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `date` date NOT NULL,
  `spa_type_id` bigint NOT NULL,
  `reason` varchar(2000) NOT NULL,
  `details` varchar(2000) NOT NULL,
  `observations` varchar(2000) NOT NULL,
  `animal_id` bigint NOT NULL,
  `company_id` bigint NOT NULL,
  `created_date` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `enabled` tinyint NOT NULL DEFAULT '1',
  `status` varchar(20) NOT NULL DEFAULT 'AGENDADA',
  PRIMARY KEY (`id`),
  KEY `fk_spas_spa_type` (`spa_type_id`),
  KEY `fk_spas_animal` (`animal_id`),
  KEY `fk_spas_company` (`company_id`),
  CONSTRAINT `fk_spas_animal` FOREIGN KEY (`animal_id`) REFERENCES `animals` (`id`),
  CONSTRAINT `fk_spas_company` FOREIGN KEY (`company_id`) REFERENCES `companies` (`id`),
  CONSTRAINT `fk_spas_spa_type` FOREIGN KEY (`spa_type_id`) REFERENCES `spa_types` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `species`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `species` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `name` varchar(100) NOT NULL,
  `created_date` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `enabled` tinyint NOT NULL DEFAULT '1',
  PRIMARY KEY (`id`),
  UNIQUE KEY `name` (`name`)
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `states`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `states` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `name` varchar(100) NOT NULL,
  `country_id` bigint NOT NULL,
  `created_date` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `enabled` tinyint NOT NULL DEFAULT '1',
  `dane_code` varchar(2) DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_states_country_name` (`country_id`,`name`),
  CONSTRAINT `fk_states_country` FOREIGN KEY (`country_id`) REFERENCES `countries` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=903 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `sub_modules`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `sub_modules` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `name` varchar(100) NOT NULL,
  `code` varchar(50) NOT NULL,
  `module_id` bigint NOT NULL,
  `created_date` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `enabled` tinyint NOT NULL DEFAULT '1',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_sub_modules_code` (`code`),
  KEY `fk_sub_modules_module` (`module_id`),
  CONSTRAINT `fk_sub_modules_module` FOREIGN KEY (`module_id`) REFERENCES `modules` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=28 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `surgeries`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `surgeries` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `date` date NOT NULL,
  `surgery_type_id` bigint NOT NULL,
  `description` varchar(2000) NOT NULL,
  `medicament` varchar(200) DEFAULT NULL,
  `observations` varchar(2000) DEFAULT NULL,
  `complications` varchar(2000) DEFAULT NULL,
  `animal_id` bigint NOT NULL,
  `consultation_id` bigint DEFAULT NULL,
  `company_id` bigint NOT NULL,
  `created_date` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `status` varchar(20) NOT NULL DEFAULT 'PROGRAMADA',
  `enabled` tinyint NOT NULL DEFAULT '1',
  PRIMARY KEY (`id`),
  KEY `fk_surgeries_company` (`company_id`),
  KEY `fk_surgeries_consultation` (`consultation_id`),
  KEY `fk_surgeries_animal` (`animal_id`),
  KEY `fk_surgeries_surgery_type` (`surgery_type_id`),
  CONSTRAINT `fk_surgeries_animal` FOREIGN KEY (`animal_id`) REFERENCES `animals` (`id`),
  CONSTRAINT `fk_surgeries_company` FOREIGN KEY (`company_id`) REFERENCES `companies` (`id`),
  CONSTRAINT `fk_surgeries_consultation` FOREIGN KEY (`consultation_id`) REFERENCES `consultations` (`id`),
  CONSTRAINT `fk_surgeries_surgery_type` FOREIGN KEY (`surgery_type_id`) REFERENCES `surgery_types` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=6 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `surgery_types`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `surgery_types` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `name` varchar(100) NOT NULL,
  `description` varchar(500) NOT NULL,
  `created_date` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `company_id` bigint DEFAULT NULL,
  `general` tinyint NOT NULL DEFAULT '0',
  `enabled` tinyint NOT NULL DEFAULT '1',
  PRIMARY KEY (`id`),
  UNIQUE KEY `name` (`name`),
  KEY `fk_surgery_types_company` (`company_id`),
  CONSTRAINT `fk_surgery_types_company` FOREIGN KEY (`company_id`) REFERENCES `companies` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `system_permissions`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `system_permissions` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `name` varchar(100) NOT NULL,
  `code` varchar(50) NOT NULL,
  `created_date` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `enabled` tinyint NOT NULL DEFAULT '1',
  PRIMARY KEY (`id`),
  UNIQUE KEY `code` (`code`)
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `system_user_permissions`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `system_user_permissions` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `system_user_id` bigint NOT NULL,
  `system_permission_id` bigint NOT NULL,
  `created_date` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `enabled` tinyint NOT NULL DEFAULT '1',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_system_user_permissions` (`system_user_id`,`system_permission_id`),
  KEY `fk_system_user_permissions_permission` (`system_permission_id`),
  CONSTRAINT `fk_system_user_permissions_permission` FOREIGN KEY (`system_permission_id`) REFERENCES `system_permissions` (`id`),
  CONSTRAINT `fk_system_user_permissions_user` FOREIGN KEY (`system_user_id`) REFERENCES `system_users` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `system_users`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `system_users` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `code` varchar(50) NOT NULL,
  `hash_password` varchar(255) NOT NULL,
  `created_date` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `enabled` tinyint NOT NULL DEFAULT '1',
  PRIMARY KEY (`id`),
  UNIQUE KEY `code` (`code`)
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `taxes`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `taxes` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `name` varchar(100) NOT NULL,
  `percentage` decimal(5,2) NOT NULL,
  `company_id` bigint NOT NULL,
  `created_date` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `enabled` tinyint NOT NULL DEFAULT '1',
  `tax_scheme` varchar(20) NOT NULL,
  PRIMARY KEY (`id`),
  KEY `fk_taxes_company` (`company_id`),
  CONSTRAINT `fk_taxes_company` FOREIGN KEY (`company_id`) REFERENCES `companies` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `v_clinical_event`;
/*!50001 DROP VIEW IF EXISTS `v_clinical_event`*/;
SET @saved_cs_client     = @@character_set_client;
/*!50503 SET character_set_client = utf8mb4 */;
/*!50001 CREATE VIEW `v_clinical_event` AS SELECT 
 1 AS `composite_key`,
 1 AS `source_id`,
 1 AS `animal_id`,
 1 AS `company_id`,
 1 AS `consultation_id`,
 1 AS `event_date`,
 1 AS `end_date`,
 1 AS `event_type`,
 1 AS `summary`*/;
SET character_set_client = @saved_cs_client;
DROP TABLE IF EXISTS `vaccination_types`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `vaccination_types` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `name` varchar(100) NOT NULL,
  `description` varchar(500) NOT NULL,
  `created_date` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `company_id` bigint DEFAULT NULL,
  `general` tinyint NOT NULL DEFAULT '0',
  `enabled` tinyint NOT NULL DEFAULT '1',
  PRIMARY KEY (`id`),
  UNIQUE KEY `name` (`name`),
  KEY `fk_vaccination_types_company` (`company_id`),
  CONSTRAINT `fk_vaccination_types_company` FOREIGN KEY (`company_id`) REFERENCES `companies` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `vaccinations`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `vaccinations` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `date` date NOT NULL,
  `vaccination_type_id` bigint NOT NULL,
  `lot` varchar(100) NOT NULL,
  `notes` varchar(2000) DEFAULT NULL,
  `next_vaccination` date DEFAULT NULL,
  `animal_id` bigint NOT NULL,
  `company_id` bigint NOT NULL,
  `created_date` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `consultation_id` bigint DEFAULT NULL,
  `enabled` tinyint NOT NULL DEFAULT '1',
  PRIMARY KEY (`id`),
  KEY `fk_vaccinations_animal` (`animal_id`),
  KEY `fk_vaccinations_company` (`company_id`),
  KEY `fk_vaccinations_vaccination_type` (`vaccination_type_id`),
  KEY `fk_vaccinations_consultation` (`consultation_id`),
  CONSTRAINT `fk_vaccinations_animal` FOREIGN KEY (`animal_id`) REFERENCES `animals` (`id`),
  CONSTRAINT `fk_vaccinations_company` FOREIGN KEY (`company_id`) REFERENCES `companies` (`id`),
  CONSTRAINT `fk_vaccinations_consultation` FOREIGN KEY (`consultation_id`) REFERENCES `consultations` (`id`),
  CONSTRAINT `fk_vaccinations_vaccination_type` FOREIGN KEY (`vaccination_type_id`) REFERENCES `vaccination_types` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=8 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
DROP TABLE IF EXISTS `withholding_configs`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `withholding_configs` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `company_id` bigint NOT NULL,
  `rete_fuente_rate` decimal(7,4) NOT NULL DEFAULT '0.0000',
  `rete_iva_rate` decimal(7,4) NOT NULL DEFAULT '0.0000',
  `rete_ica_rate` decimal(7,4) NOT NULL DEFAULT '0.0000',
  `created_date` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `enabled` tinyint NOT NULL DEFAULT '1',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_withholding_configs_company` (`company_id`),
  CONSTRAINT `fk_withholding_configs_company` FOREIGN KEY (`company_id`) REFERENCES `companies` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!50001 DROP VIEW IF EXISTS `v_clinical_event`*/;
/*!50001 SET @saved_cs_client          = @@character_set_client */;
/*!50001 SET @saved_cs_results         = @@character_set_results */;
/*!50001 SET @saved_col_connection     = @@collation_connection */;
/*!50001 SET character_set_client      = utf8mb4 */;
/*!50001 SET character_set_results     = utf8mb4 */;
/*!50001 SET collation_connection      = utf8mb4_0900_ai_ci */;
/*!50001 CREATE ALGORITHM=UNDEFINED */
/*!50013 DEFINER=`cronos`@`%` SQL SECURITY DEFINER */
/*!50001 VIEW `v_clinical_event` AS select cast(concat('CONSULTATION-',`c`.`id`) as char(64) charset utf8mb4) AS `composite_key`,`c`.`id` AS `source_id`,`c`.`animal_id` AS `animal_id`,`c`.`company_id` AS `company_id`,nullif(`c`.`id`,`c`.`id`) AS `consultation_id`,`c`.`date` AS `event_date`,cast(NULL as date) AS `end_date`,cast('CONSULTATION' as char(32) charset utf8mb4) AS `event_type`,cast(`ct`.`name` as char(255) charset utf8mb4) AS `summary` from (`consultations` `c` join `consultation_types` `ct` on((`ct`.`id` = `c`.`consultation_type_id`))) where (`c`.`enabled` = true) union all select cast(concat('SURGERY-',`s`.`id`) as char(64) charset utf8mb4) AS `CAST(CONCAT('SURGERY-', s.id) AS CHAR(64))`,`s`.`id` AS `id`,`s`.`animal_id` AS `animal_id`,`s`.`company_id` AS `company_id`,`s`.`consultation_id` AS `consultation_id`,`s`.`date` AS `date`,cast(NULL as date) AS `CAST(NULL AS DATE)`,cast('SURGERY' as char(32) charset utf8mb4) AS `CAST('SURGERY' AS CHAR(32))`,cast(`st`.`name` as char(255) charset utf8mb4) AS `CAST(st.name AS CHAR(255))` from (`surgeries` `s` join `surgery_types` `st` on((`st`.`id` = `s`.`surgery_type_id`))) where (`s`.`enabled` = true) union all select cast(concat('VACCINATION-',`v`.`id`) as char(64) charset utf8mb4) AS `CAST(CONCAT('VACCINATION-', v.id) AS CHAR(64))`,`v`.`id` AS `id`,`v`.`animal_id` AS `animal_id`,`v`.`company_id` AS `company_id`,`v`.`consultation_id` AS `consultation_id`,`v`.`date` AS `date`,cast(NULL as date) AS `CAST(NULL AS DATE)`,cast('VACCINATION' as char(32) charset utf8mb4) AS `CAST('VACCINATION' AS CHAR(32))`,cast(`vt`.`name` as char(255) charset utf8mb4) AS `CAST(vt.name AS CHAR(255))` from (`vaccinations` `v` join `vaccination_types` `vt` on((`vt`.`id` = `v`.`vaccination_type_id`))) where (`v`.`enabled` = true) union all select cast(concat('DEWORMING-',`d`.`id`) as char(64) charset utf8mb4) AS `CAST(CONCAT('DEWORMING-', d.id) AS CHAR(64))`,`d`.`id` AS `id`,`d`.`animal_id` AS `animal_id`,`d`.`company_id` AS `company_id`,`d`.`consultation_id` AS `consultation_id`,`d`.`date` AS `date`,cast(NULL as date) AS `CAST(NULL AS DATE)`,cast('DEWORMING' as char(32) charset utf8mb4) AS `CAST('DEWORMING' AS CHAR(32))`,cast(`d`.`product` as char(255) charset utf8mb4) AS `CAST(d.product AS CHAR(255))` from `dewormings` `d` where (`d`.`enabled` = true) union all select cast(concat('HOSPITALIZATION-',`h`.`id`) as char(64) charset utf8mb4) AS `CAST(CONCAT('HOSPITALIZATION-', h.id) AS CHAR(64))`,`h`.`id` AS `id`,`h`.`animal_id` AS `animal_id`,`h`.`company_id` AS `company_id`,`h`.`consultation_id` AS `consultation_id`,`h`.`start_date` AS `start_date`,`h`.`end_date` AS `end_date`,cast('HOSPITALIZATION' as char(32) charset utf8mb4) AS `CAST('HOSPITALIZATION' AS CHAR(32))`,cast(left(`h`.`reason`,255) as char(255) charset utf8mb4) AS `CAST(LEFT(h.reason, 255) AS CHAR(255))` from `hospitalizations` `h` where (`h`.`enabled` = true) union all select cast(concat('LABORATORY_TEST-',`l`.`id`) as char(64) charset utf8mb4) AS `CAST(CONCAT('LABORATORY_TEST-', l.id) AS CHAR(64))`,`l`.`id` AS `id`,`l`.`animal_id` AS `animal_id`,`l`.`company_id` AS `company_id`,`l`.`consultation_id` AS `consultation_id`,`l`.`date` AS `date`,cast(NULL as date) AS `CAST(NULL AS DATE)`,cast('LABORATORY_TEST' as char(32) charset utf8mb4) AS `CAST('LABORATORY_TEST' AS CHAR(32))`,cast(`lt`.`name` as char(255) charset utf8mb4) AS `CAST(lt.name AS CHAR(255))` from (`laboratory_tests` `l` join `laboratory_test_types` `lt` on((`lt`.`id` = `l`.`test_type_id`))) where (`l`.`enabled` = true) union all select cast(concat('DIAGNOSTIC_IMAGING-',`di`.`id`) as char(64) charset utf8mb4) AS `CAST(CONCAT('DIAGNOSTIC_IMAGING-', di.id) AS CHAR(64))`,`di`.`id` AS `id`,`di`.`animal_id` AS `animal_id`,`di`.`company_id` AS `company_id`,`di`.`consultation_id` AS `consultation_id`,`di`.`date` AS `date`,cast(NULL as date) AS `CAST(NULL AS DATE)`,cast('DIAGNOSTIC_IMAGING' as char(32) charset utf8mb4) AS `CAST('DIAGNOSTIC_IMAGING' AS CHAR(32))`,cast(`dit`.`name` as char(255) charset utf8mb4) AS `CAST(dit.name AS CHAR(255))` from (`diagnostic_imagings` `di` join `diagnostic_imaging_types` `dit` on((`dit`.`id` = `di`.`diagnostic_imaging_type_id`))) where (`di`.`enabled` = true) union all select cast(concat('PRESCRIPTION-',`p`.`id`) as char(64) charset utf8mb4) AS `CAST(CONCAT('PRESCRIPTION-', p.id) AS CHAR(64))`,`p`.`id` AS `id`,`p`.`animal_id` AS `animal_id`,`p`.`company_id` AS `company_id`,`p`.`consultation_id` AS `consultation_id`,`p`.`date` AS `date`,cast(NULL as date) AS `CAST(NULL AS DATE)`,cast('PRESCRIPTION' as char(32) charset utf8mb4) AS `CAST('PRESCRIPTION' AS CHAR(32))`,cast(left(`p`.`diagnosis`,255) as char(255) charset utf8mb4) AS `CAST(LEFT(p.diagnosis, 255) AS CHAR(255))` from `prescriptions` `p` where (`p`.`enabled` = true) union all select cast(concat('SPA-',`sp`.`id`) as char(64) charset utf8mb4) AS `CAST(CONCAT('SPA-', sp.id) AS CHAR(64))`,`sp`.`id` AS `id`,`sp`.`animal_id` AS `animal_id`,`sp`.`company_id` AS `company_id`,nullif(`sp`.`id`,`sp`.`id`) AS `consultation_id`,`sp`.`date` AS `date`,cast(NULL as date) AS `CAST(NULL AS DATE)`,cast('SPA' as char(32) charset utf8mb4) AS `CAST('SPA' AS CHAR(32))`,cast(`spt`.`name` as char(255) charset utf8mb4) AS `CAST(spt.name AS CHAR(255))` from (`spas` `sp` join `spa_types` `spt` on((`spt`.`id` = `sp`.`spa_type_id`))) where (`sp`.`enabled` = true) */;
/*!50001 SET character_set_client      = @saved_cs_client */;
/*!50001 SET character_set_results     = @saved_cs_results */;
/*!50001 SET collation_connection      = @saved_col_connection */;
/*!40103 SET TIME_ZONE=@OLD_TIME_ZONE */;

/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40014 SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
/*!40111 SET SQL_NOTES=@OLD_SQL_NOTES */;

