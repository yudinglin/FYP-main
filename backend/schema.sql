-- -----------------------------------------------------------------------------
-- Database & defaults
-- -----------------------------------------------------------------------------
CREATE DATABASE IF NOT EXISTS youanalyze
  DEFAULT CHARACTER SET utf8mb4
  DEFAULT COLLATE utf8mb4_unicode_ci;
USE youanalyze;

SET NAMES utf8mb4;
SET time_zone = '+00:00';

-- -----------------------------------------------------------------------------
-- Core: User & reference dictionaries
-- -----------------------------------------------------------------------------
CREATE TABLE `User` (
  user_id       INT AUTO_INCREMENT PRIMARY KEY,
  email         VARCHAR(255) NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  first_name    VARCHAR(60) NOT NULL,
  last_name     VARCHAR(60) NOT NULL,
  role          ENUM('creator','business','admin') NOT NULL DEFAULT 'creator',
  status        ENUM('ACTIVE','SUSPENDED') NOT NULL DEFAULT 'ACTIVE',
  created_at    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uk_user_email (email)
) ENGINE=InnoDB;

CREATE TABLE Industry (
  industry_id INT AUTO_INCREMENT PRIMARY KEY,
  name        VARCHAR(120) NOT NULL,
  description TEXT,
  UNIQUE KEY uk_industry_name (name)
) ENGINE=InnoDB;

-- -----------------------------------------------------------------------------
-- Plans / Subscriptions / Payments
-- -----------------------------------------------------------------------------
CREATE TABLE SubscriptionPlan (
  plan_id           INT AUTO_INCREMENT PRIMARY KEY,
  name              VARCHAR(100) NOT NULL,
  description       TEXT,
  target_role       ENUM('creator','business','BOTH') NOT NULL DEFAULT 'BOTH',
  price_monthly     DECIMAL(10,2) NOT NULL,
  max_channels      INT NOT NULL DEFAULT 1,
  max_saved_graphs  INT NOT NULL DEFAULT 5,
  is_active         BOOLEAN NOT NULL DEFAULT TRUE,
  UNIQUE KEY uk_plan_name (name)
) ENGINE=InnoDB;

CREATE TABLE Subscription (
  subscription_id INT AUTO_INCREMENT PRIMARY KEY,
  user_id         INT NOT NULL,
  plan_id         INT NOT NULL,
  status          ENUM('ACTIVE','CANCELLED','EXPIRED') NOT NULL DEFAULT 'ACTIVE',
  start_date      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  end_date        DATETIME NULL,
  cancelled_at    DATETIME NULL,
  CONSTRAINT fk_sub_user
    FOREIGN KEY (user_id) REFERENCES `User`(user_id)
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT fk_sub_plan
    FOREIGN KEY (plan_id) REFERENCES SubscriptionPlan(plan_id)
    ON DELETE RESTRICT ON UPDATE CASCADE,
  KEY idx_sub_user_status (user_id, status)
) ENGINE=InnoDB;

CREATE TABLE Payment (
  payment_id      INT AUTO_INCREMENT PRIMARY KEY,
  subscription_id INT NOT NULL,
  amount          DECIMAL(10,2) NOT NULL,
  currency        VARCHAR(10) NOT NULL DEFAULT 'SGD',
  payment_date    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  status          ENUM('SUCCESS','FAILED','PENDING') NOT NULL DEFAULT 'PENDING',
  method          VARCHAR(50),
  CONSTRAINT fk_pay_sub
    FOREIGN KEY (subscription_id) REFERENCES Subscription(subscription_id)
    ON DELETE CASCADE ON UPDATE CASCADE,
  KEY idx_payment_status (status),
  KEY idx_payment_date (payment_date)
) ENGINE=InnoDB;

-- -----------------------------------------------------------------------------
-- Profiles (Class-Table Inheritance)
-- -----------------------------------------------------------------------------
CREATE TABLE CreatorProfile (
  user_id            INT NOT NULL,
  display_name       VARCHAR(120) NOT NULL,
  bio                TEXT,
  primary_channel_id INT NULL,  -- FK added after YouTubeChannel exists
  PRIMARY KEY (user_id),
  CONSTRAINT fk_cp_user
    FOREIGN KEY (user_id) REFERENCES `User`(user_id)
    ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB;

CREATE TABLE BusinessProfile (
  user_id        INT NOT NULL,
  company_name   VARCHAR(160) NOT NULL,
  industry_id    INT NOT NULL,
  website_url    VARCHAR(255),
  contact_person VARCHAR(120),
  PRIMARY KEY (user_id),
  KEY idx_bp_industry (industry_id),
  CONSTRAINT fk_bp_user
    FOREIGN KEY (user_id) REFERENCES `User`(user_id)
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT fk_bp_industry
    FOREIGN KEY (industry_id) REFERENCES Industry(industry_id)
    ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB;

CREATE TABLE AdminProfile (
  user_id         INT NOT NULL,
  staff_no        VARCHAR(40) NOT NULL,
  position_title  VARCHAR(120) NOT NULL,
  department      VARCHAR(80),
  employment_type ENUM('FULL_TIME','PART_TIME','INTERN','CONTRACT') NOT NULL DEFAULT 'FULL_TIME',
  joined_at       DATE,
  phone_ext       VARCHAR(20),
  notes           TEXT,
  created_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (user_id),
  UNIQUE KEY uk_admin_staff_no (staff_no),
  CONSTRAINT fk_ap_user
    FOREIGN KEY (user_id) REFERENCES `User`(user_id)
    ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB;

-- -----------------------------------------------------------------------------
-- YouTube channels & analytics
-- -----------------------------------------------------------------------------
CREATE TABLE YouTubeChannel (
  channel_id          INT AUTO_INCREMENT PRIMARY KEY,
  owner_user_id       INT NOT NULL,
  youtube_channel_id  VARCHAR(255) NOT NULL,
  channel_name        VARCHAR(255),
  is_primary          BOOLEAN NOT NULL DEFAULT FALSE,
  created_at          DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_yt_owner
    FOREIGN KEY (owner_user_id) REFERENCES `User`(user_id)
    ON DELETE CASCADE ON UPDATE CASCADE,
  UNIQUE KEY uk_youtube_channel_id (youtube_channel_id),
  KEY idx_owner_primary (owner_user_id, is_primary)
) ENGINE=InnoDB;

-- now link CreatorProfile.primary_channel_id → YouTubeChannel
ALTER TABLE CreatorProfile
  ADD CONSTRAINT fk_cp_primary_channel
  FOREIGN KEY (primary_channel_id) REFERENCES YouTubeChannel(channel_id)
  ON DELETE SET NULL ON UPDATE CASCADE;

CREATE TABLE NetworkGraph (
  graph_id     INT AUTO_INCREMENT PRIMARY KEY,
  owner_user_id INT NOT NULL,
  channel_id   INT NULL,
  graph_type   ENUM('CHANNEL_INTERACTION','INDUSTRY') NOT NULL DEFAULT 'CHANNEL_INTERACTION',
  title        VARCHAR(255),
  description  TEXT,
  graph_data   JSON,
  created_at   DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at   DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  is_saved     BOOLEAN NOT NULL DEFAULT TRUE,
  CONSTRAINT fk_ng_owner
    FOREIGN KEY (owner_user_id) REFERENCES `User`(user_id)
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT fk_ng_channel
    FOREIGN KEY (channel_id) REFERENCES YouTubeChannel(channel_id)
    ON DELETE SET NULL ON UPDATE CASCADE,
  KEY idx_ng_owner (owner_user_id),
  KEY idx_ng_saved (is_saved)
) ENGINE=InnoDB;

CREATE TABLE CentralityMetric (
  metric_id               INT AUTO_INCREMENT PRIMARY KEY,
  graph_id                INT NOT NULL,
  node_identifier         VARCHAR(255) NOT NULL,
  degree_centrality       DOUBLE,
  betweenness_centrality  DOUBLE,
  closeness_centrality    DOUBLE,
  eigenvector_centrality  DOUBLE,
  CONSTRAINT fk_cm_graph
    FOREIGN KEY (graph_id) REFERENCES NetworkGraph(graph_id)
    ON DELETE CASCADE ON UPDATE CASCADE,
  KEY idx_cm_graph_node (graph_id, node_identifier)
) ENGINE=InnoDB;

CREATE TABLE Prediction (
  prediction_id    INT AUTO_INCREMENT PRIMARY KEY,
  channel_id       INT NOT NULL,
  model_type       VARCHAR(50),
  predicted_metric ENUM('SUBSCRIBER_GROWTH','CAMPAIGN_REACH') NOT NULL,
  prediction_data  JSON,
  created_at       DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_pred_channel
    FOREIGN KEY (channel_id) REFERENCES YouTubeChannel(channel_id)
    ON DELETE CASCADE ON UPDATE CASCADE,
  KEY idx_pred_metric (predicted_metric),
  KEY idx_pred_channel (channel_id)
) ENGINE=InnoDB;

-- -----------------------------------------------------------------------------
-- Support & Reviews
-- -----------------------------------------------------------------------------
CREATE TABLE SupportTicket (
  ticket_id   INT AUTO_INCREMENT PRIMARY KEY,
  user_id     INT NULL,               -- nullable for guest
  name        VARCHAR(120),           -- for guest
  email       VARCHAR(255),           -- for guest
  subject     VARCHAR(200) NOT NULL,
  message     TEXT NOT NULL,
  status      ENUM('OPEN','ANSWERED','CLOSED') NOT NULL DEFAULT 'OPEN',
  created_at  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_st_user
    FOREIGN KEY (user_id) REFERENCES `User`(user_id)
    ON DELETE SET NULL ON UPDATE CASCADE,
  KEY idx_st_status (status),
  KEY idx_st_user (user_id)
) ENGINE=InnoDB;

CREATE TABLE SupportResponse (
  response_id INT AUTO_INCREMENT PRIMARY KEY,
  ticket_id   INT NOT NULL,
  admin_id    INT NOT NULL,           -- User.role should be ADMIN (enforce in app)
  message     TEXT NOT NULL,
  created_at  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_sr_ticket
    FOREIGN KEY (ticket_id) REFERENCES SupportTicket(ticket_id)
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT fk_sr_admin
    FOREIGN KEY (admin_id) REFERENCES `User`(user_id)
    ON DELETE RESTRICT ON UPDATE CASCADE,
  KEY idx_sr_ticket (ticket_id)
) ENGINE=InnoDB;

CREATE TABLE Review (
  review_id   INT AUTO_INCREMENT PRIMARY KEY,
  user_id     INT NOT NULL,
  rating      TINYINT NOT NULL,   -- 1..5 (validate in app/check)
  comment     TEXT,
  created_at  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  status      ENUM('VISIBLE','HIDDEN') NOT NULL DEFAULT 'VISIBLE',
  CONSTRAINT fk_review_user
    FOREIGN KEY (user_id) REFERENCES `User`(user_id)
    ON DELETE CASCADE ON UPDATE CASCADE,
  KEY idx_review_status (status),
  KEY idx_review_user (user_id)
) ENGINE=InnoDB;


