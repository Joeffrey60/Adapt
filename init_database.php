<?php
require_once 'config.php';

// Script d'initialisation de la base de données
echo "Initialisation de la base de données...\n";

try {
    // Table des utilisateurs/joueurs
    $sql_player = "
    CREATE TABLE IF NOT EXISTS player (
        id INT AUTO_INCREMENT PRIMARY KEY,
        username VARCHAR(50) UNIQUE NOT NULL,
        email VARCHAR(100) UNIQUE NOT NULL,
        password VARCHAR(255) NOT NULL,
        display_name VARCHAR(100),
        avatar VARCHAR(255),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        is_active BOOLEAN DEFAULT TRUE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci";
    
    $pdo->exec($sql_player);
    echo "✓ Table 'player' créée avec succès\n";

    // Table des artistes
    $sql_artists = "
    CREATE TABLE IF NOT EXISTS artists (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        bio TEXT,
        image VARCHAR(255),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci";
    
    $pdo->exec($sql_artists);
    echo "✓ Table 'artists' créée avec succès\n";

    // Table des albums
    $sql_albums = "
    CREATE TABLE IF NOT EXISTS albums (
        id INT AUTO_INCREMENT PRIMARY KEY,
        title VARCHAR(255) NOT NULL,
        artist_id INT,
        cover_image VARCHAR(255),
        release_date DATE,
        genre VARCHAR(100),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (artist_id) REFERENCES artists(id) ON DELETE SET NULL
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci";
    
    $pdo->exec($sql_albums);
    echo "✓ Table 'albums' créée avec succès\n";

    // Table des chansons
    $sql_songs = "
    CREATE TABLE IF NOT EXISTS songs (
        id INT AUTO_INCREMENT PRIMARY KEY,
        title VARCHAR(255) NOT NULL,
        artist_id INT,
        album_id INT,
        file_path VARCHAR(500) NOT NULL,
        file_size BIGINT,
        duration INT,
        track_number INT,
        genre VARCHAR(100),
        year INT,
        bitrate INT,
        format VARCHAR(10),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (artist_id) REFERENCES artists(id) ON DELETE SET NULL,
        FOREIGN KEY (album_id) REFERENCES albums(id) ON DELETE SET NULL
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci";
    
    $pdo->exec($sql_songs);
    echo "✓ Table 'songs' créée avec succès\n";

    // Table des playlists
    $sql_playlists = "
    CREATE TABLE IF NOT EXISTS playlists (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        description TEXT,
        user_id INT NOT NULL,
        is_public BOOLEAN DEFAULT FALSE,
        cover_image VARCHAR(255),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES player(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci";
    
    $pdo->exec($sql_playlists);
    echo "✓ Table 'playlists' créée avec succès\n";

    // Table de liaison playlist-songs
    $sql_playlist_songs = "
    CREATE TABLE IF NOT EXISTS playlist_songs (
        id INT AUTO_INCREMENT PRIMARY KEY,
        playlist_id INT NOT NULL,
        song_id INT NOT NULL,
        position INT NOT NULL DEFAULT 0,
        added_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (playlist_id) REFERENCES playlists(id) ON DELETE CASCADE,
        FOREIGN KEY (song_id) REFERENCES songs(id) ON DELETE CASCADE,
        UNIQUE KEY unique_playlist_song (playlist_id, song_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci";
    
    $pdo->exec($sql_playlist_songs);
    echo "✓ Table 'playlist_songs' créée avec succès\n";

    // Table des favoris
    $sql_favorites = "
    CREATE TABLE IF NOT EXISTS favorites (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL,
        song_id INT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES player(id) ON DELETE CASCADE,
        FOREIGN KEY (song_id) REFERENCES songs(id) ON DELETE CASCADE,
        UNIQUE KEY unique_user_song (user_id, song_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci";
    
    $pdo->exec($sql_favorites);
    echo "✓ Table 'favorites' créée avec succès\n";

    // Table de l'historique d'écoute
    $sql_play_history = "
    CREATE TABLE IF NOT EXISTS play_history (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL,
        song_id INT NOT NULL,
        played_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        duration_played INT DEFAULT 0,
        FOREIGN KEY (user_id) REFERENCES player(id) ON DELETE CASCADE,
        FOREIGN KEY (song_id) REFERENCES songs(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci";
    
    $pdo->exec($sql_play_history);
    echo "✓ Table 'play_history' créée avec succès\n";

    // Table des paramètres utilisateur
    $sql_user_settings = "
    CREATE TABLE IF NOT EXISTS user_settings (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL,
        setting_key VARCHAR(100) NOT NULL,
        setting_value TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES player(id) ON DELETE CASCADE,
        UNIQUE KEY unique_user_setting (user_id, setting_key)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci";
    
    $pdo->exec($sql_user_settings);
    echo "✓ Table 'user_settings' créée avec succès\n";

    // Créer les répertoires nécessaires
    if (!file_exists(MUSIC_DIR)) {
        mkdir(MUSIC_DIR, 0755, true);
        echo "✓ Répertoire 'music' créé\n";
    }

    if (!file_exists(COVERS_DIR)) {
        mkdir(COVERS_DIR, 0755, true);
        echo "✓ Répertoire 'covers' créé\n";
    }

    // Insérer un utilisateur admin par défaut
    $admin_password = password_hash('admin123', PASSWORD_DEFAULT);
    $stmt = $pdo->prepare("INSERT IGNORE INTO player (username, email, password, display_name) VALUES (?, ?, ?, ?)");
    $stmt->execute(['admin', 'admin@example.com', $admin_password, 'Administrateur']);
    
    if ($stmt->rowCount() > 0) {
        echo "✓ Utilisateur admin créé (username: admin, password: admin123)\n";
    }

    echo "\n🎉 Base de données initialisée avec succès !\n";
    echo "Vous pouvez maintenant utiliser votre application musicale.\n";

} catch(PDOException $e) {
    echo "❌ Erreur lors de l'initialisation : " . $e->getMessage() . "\n";
    exit(1);
}
?>