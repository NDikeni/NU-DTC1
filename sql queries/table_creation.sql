-- CREATE DATABASE IF NOT EXISTS dining_app;
USE dining_app;

-- CREATE TABLE auth (
--     username VARCHAR(255) PRIMARY KEY,
--     user_uuid CHAR(36) NOT NULL UNIQUE
-- );

-- CREATE TABLE food (
--     food_uuid CHAR(36) PRIMARY KEY,
--     food_name VARCHAR(255) NOT NULL,
--     users_liked_count INT NOT NULL DEFAULT 0,
--     meal_period ENUM('BREAKFAST', 'LUNCH', 'DINNER') NOT NULL,
--     s3_bucket_id VARCHAR(255)
-- );

-- CREATE TABLE food_dining_halls (
--     food_uuid CHAR(36) NOT NULL,
--     dining_hall ENUM(
--         'SARGE',
--         'ALLISON',
--         'PLEX-EAST',
--         'PLEX-WEST',
--         'ELDER'
--     ) NOT NULL,

--     PRIMARY KEY (food_uuid, dining_hall),

--     FOREIGN KEY (food_uuid) REFERENCES food(food_uuid)
--         ON DELETE CASCADE
--         ON UPDATE CASCADE
-- );

-- CREATE TABLE user_preferences (
--     preference_id BIGINT AUTO_INCREMENT PRIMARY KEY,
--     user_uuid CHAR(36) NOT NULL,
--     food_uuid CHAR(36) NOT NULL,
--     preference_date DATE NOT NULL,
--     preference_time TIME NOT NULL,

--     dining_hall_name ENUM(
--         'SARGE',
--         'ALLISON',
--         'PLEX-EAST',
--         'PLEX-WEST',
--         'ELDER'
--     ) NOT NULL,

--     day_of_week ENUM(
--         'Monday',
--         'Tuesday',
--         'Wednesday',
--         'Thursday',
--         'Friday',
--         'Saturday',
--         'Sunday'
--     ) NOT NULL,

--     FOREIGN KEY (user_uuid) REFERENCES auth(user_uuid)
--         ON DELETE CASCADE
--         ON UPDATE CASCADE,

--     FOREIGN KEY (food_uuid) REFERENCES food(food_uuid)
--         ON DELETE CASCADE
--         ON UPDATE CASCADE
-- );

ALTER TABLE user_preferences
ADD UNIQUE KEY unique_user_food_hall (
  user_uuid,
  food_uuid,
  dining_hall_name
);