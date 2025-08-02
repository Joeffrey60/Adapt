-- Script de création des tables pour MusicStream Pro
-- Base de données: nihcjh_nexiumsu_db
-- Version adaptée pour la table 'songs'

-- Table des utilisateurs (players)
CREATE TABLE IF NOT EXISTS `player` (
    `id` int(11) NOT NULL AUTO_INCREMENT,
    `username` varchar(50) NOT NULL UNIQUE,
    `email` varchar(100) NOT NULL UNIQUE,
    `password` varchar(255) NOT NULL,
    `role` enum('user', 'admin') DEFAULT 'user',
    `avatar_url` varchar(255) DEFAULT NULL,
    `created_at` timestamp DEFAULT CURRENT_TIMESTAMP,
    `last_active` timestamp DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    `is_active` tinyint(1) DEFAULT 1,
    PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Table des chansons (adaptée à votre structure existante)
CREATE TABLE IF NOT EXISTS `songs` (
    `id` int(11) NOT NULL AUTO_INCREMENT,
    `title` varchar(255) NOT NULL,
    `artist` varchar(255) NOT NULL,
    `album` varchar(255) DEFAULT 'Single',
    `duration` int(11) DEFAULT NULL COMMENT 'Durée en secondes',
    `file_path` varchar(500) NOT NULL,
    `cover_path` varchar(500) DEFAULT NULL,
    `upload_date` timestamp DEFAULT CURRENT_TIMESTAMP,
    `uploaded_by` int(11) DEFAULT NULL,
    `plays` int(11) DEFAULT 0,
    `status` enum('pending', 'approved', 'rejected') DEFAULT 'pending',
    `approved_by` int(11) DEFAULT NULL,
    `approved_at` timestamp NULL DEFAULT NULL,
    PRIMARY KEY (`id`),
    KEY `idx_artist` (`artist`),
    KEY `idx_album` (`album`),
    KEY `idx_status` (`status`),
    KEY `idx_uploaded_by` (`uploaded_by`),
    KEY `idx_approved_by` (`approved_by`),
    FOREIGN KEY (`uploaded_by`) REFERENCES `player`(`id`) ON DELETE SET NULL,
    FOREIGN KEY (`approved_by`) REFERENCES `player`(`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Table des playlists
CREATE TABLE IF NOT EXISTS `playlists` (
    `id` int(11) NOT NULL AUTO_INCREMENT,
    `name` varchar(255) NOT NULL,
    `description` text DEFAULT NULL,
    `icon` varchar(10) DEFAULT '🎵',
    `user_id` int(11) NOT NULL,
    `created_at` timestamp DEFAULT CURRENT_TIMESTAMP,
    `updated_at` timestamp DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    `is_public` tinyint(1) DEFAULT 0,
    `track_count` int(11) DEFAULT 0,
    PRIMARY KEY (`id`),
    KEY `idx_user_id` (`user_id`),
    FOREIGN KEY (`user_id`) REFERENCES `player`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Table de liaison playlist-chanson (adaptée pour songs)
CREATE TABLE IF NOT EXISTS `playlist_tracks` (
    `id` int(11) NOT NULL AUTO_INCREMENT,
    `playlist_id` int(11) NOT NULL,
    `song_id` int(11) NOT NULL,
    `position` int(11) DEFAULT 0,
    `added_at` timestamp DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`),
    UNIQUE KEY `unique_playlist_song` (`playlist_id`, `song_id`),
    KEY `idx_playlist_id` (`playlist_id`),
    KEY `idx_song_id` (`song_id`),
    FOREIGN KEY (`playlist_id`) REFERENCES `playlists`(`id`) ON DELETE CASCADE,
    FOREIGN KEY (`song_id`) REFERENCES `songs`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Table des favoris (adaptée pour songs)
CREATE TABLE IF NOT EXISTS `favorites` (
    `id` int(11) NOT NULL AUTO_INCREMENT,
    `user_id` int(11) NOT NULL,
    `song_id` int(11) NOT NULL,
    `added_at` timestamp DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`),
    UNIQUE KEY `unique_user_song` (`user_id`, `song_id`),
    KEY `idx_user_id` (`user_id`),
    KEY `idx_song_id` (`song_id`),
    FOREIGN KEY (`user_id`) REFERENCES `player`(`id`) ON DELETE CASCADE,
    FOREIGN KEY (`song_id`) REFERENCES `songs`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Table des sessions (optionnel, pour une gestion avancée des sessions)
CREATE TABLE IF NOT EXISTS `user_sessions` (
    `id` varchar(128) NOT NULL,
    `user_id` int(11) DEFAULT NULL,
    `data` text,
    `created_at` timestamp DEFAULT CURRENT_TIMESTAMP,
    `updated_at` timestamp DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    `expires_at` timestamp NULL DEFAULT NULL,
    PRIMARY KEY (`id`),
    KEY `idx_user_id` (`user_id`),
    KEY `idx_expires_at` (`expires_at`),
    FOREIGN KEY (`user_id`) REFERENCES `player`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Table des logs d'activité (optionnel)
CREATE TABLE IF NOT EXISTS `activity_logs` (
    `id` int(11) NOT NULL AUTO_INCREMENT,
    `user_id` int(11) DEFAULT NULL,
    `action` varchar(100) NOT NULL,
    `target_type` varchar(50) DEFAULT NULL COMMENT 'song, playlist, user, etc.',
    `target_id` int(11) DEFAULT NULL,
    `details` json DEFAULT NULL,
    `ip_address` varchar(45) DEFAULT NULL,
    `user_agent` text DEFAULT NULL,
    `created_at` timestamp DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`),
    KEY `idx_user_id` (`user_id`),
    KEY `idx_action` (`action`),
    KEY `idx_created_at` (`created_at`),
    FOREIGN KEY (`user_id`) REFERENCES `player`(`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Insertion d'un utilisateur admin par défaut
INSERT IGNORE INTO `player` (`username`, `email`, `password`, `role`) 
VALUES ('admin', 'admin@musicstream.com', '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'admin');

-- Triggers pour maintenir le compteur de tracks dans les playlists
DELIMITER $$

CREATE TRIGGER IF NOT EXISTS `update_playlist_count_insert` 
AFTER INSERT ON `playlist_tracks`
FOR EACH ROW
BEGIN
    UPDATE `playlists` 
    SET `track_count` = (
        SELECT COUNT(*) 
        FROM `playlist_tracks` 
        WHERE `playlist_id` = NEW.playlist_id
    ) 
    WHERE `id` = NEW.playlist_id;
END$$

CREATE TRIGGER IF NOT EXISTS `update_playlist_count_delete` 
AFTER DELETE ON `playlist_tracks`
FOR EACH ROW
BEGIN
    UPDATE `playlists` 
    SET `track_count` = (
        SELECT COUNT(*) 
        FROM `playlist_tracks` 
        WHERE `playlist_id` = OLD.playlist_id
    ) 
    WHERE `id` = OLD.playlist_id;
END$$

-- Trigger pour mettre à jour approved_at quand status change vers 'approved'
CREATE TRIGGER IF NOT EXISTS `update_approved_at` 
BEFORE UPDATE ON `songs`
FOR EACH ROW
BEGIN
    IF NEW.status = 'approved' AND OLD.status != 'approved' THEN
        SET NEW.approved_at = NOW();
    END IF;
END$$

DELIMITER ;

-- Index pour améliorer les performances de recherche
CREATE INDEX IF NOT EXISTS `idx_songs_search` ON `songs` (`title`, `artist`, `album`);
CREATE INDEX IF NOT EXISTS `idx_songs_approved` ON `songs` (`status`, `approved_at`);

-- Vues pour simplifier les requêtes complexes (adaptées pour songs)
CREATE OR REPLACE VIEW `songs_with_stats` AS
SELECT 
    s.*,
    p.username as uploader_name,
    ap.username as approver_name,
    (SELECT COUNT(*) FROM favorites f WHERE f.song_id = s.id) as favorite_count,
    (SELECT COUNT(*) FROM playlist_tracks pt WHERE pt.song_id = s.id) as playlist_count
FROM songs s
LEFT JOIN player p ON s.uploaded_by = p.id
LEFT JOIN player ap ON s.approved_by = ap.id;

CREATE OR REPLACE VIEW `user_stats` AS
SELECT 
    p.id,
    p.username,
    p.email,
    p.role,
    p.created_at,
    p.last_active,
    (SELECT COUNT(*) FROM songs s WHERE s.uploaded_by = p.id) as uploaded_count,
    (SELECT COUNT(*) FROM songs s WHERE s.uploaded_by = p.id AND s.status = 'approved') as approved_count,
    (SELECT COUNT(*) FROM playlists pl WHERE pl.user_id = p.id) as playlist_count,
    (SELECT COUNT(*) FROM favorites f WHERE f.user_id = p.id) as favorite_count
FROM player p
WHERE p.is_active = 1;