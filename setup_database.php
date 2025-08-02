<?php
// Script de setup de la base de données pour MusicStream Pro
// Ce script doit être exécuté une seule fois pour créer les tables

// Inclure la configuration de la base de données
require_once 'config.php'; // Assurez-vous que le nom du fichier de config est correct

echo "🎵 MusicStream Pro - Setup de la base de données\n";
echo "================================================\n\n";

try {
    // Lire le fichier SQL
    $sqlFile = 'create_tables.sql';
    if (!file_exists($sqlFile)) {
        throw new Exception("Le fichier SQL '$sqlFile' n'existe pas.");
    }
    
    $sql = file_get_contents($sqlFile);
    if ($sql === false) {
        throw new Exception("Impossible de lire le fichier SQL.");
    }
    
    echo "📁 Fichier SQL chargé avec succès.\n";
    
    // Séparer les requêtes SQL
    $queries = explode(';', $sql);
    $successCount = 0;
    $errorCount = 0;
    
    echo "🔧 Exécution des requêtes SQL...\n\n";
    
    foreach ($queries as $query) {
        $query = trim($query);
        
        // Ignorer les requêtes vides et les commentaires
        if (empty($query) || strpos($query, '--') === 0) {
            continue;
        }
        
        try {
            $pdo->exec($query);
            $successCount++;
            
            // Afficher des messages pour les actions importantes
            if (strpos($query, 'CREATE TABLE') !== false) {
                preg_match('/CREATE TABLE.*?`([^`]+)`/', $query, $matches);
                $tableName = $matches[1] ?? 'inconnue';
                echo "✅ Table '$tableName' créée avec succès.\n";
            } elseif (strpos($query, 'CREATE TRIGGER') !== false) {
                preg_match('/CREATE TRIGGER.*?`([^`]+)`/', $query, $matches);
                $triggerName = $matches[1] ?? 'inconnu';
                echo "✅ Trigger '$triggerName' créé avec succès.\n";
            } elseif (strpos($query, 'CREATE.*VIEW') !== false) {
                preg_match('/CREATE.*VIEW.*?`([^`]+)`/', $query, $matches);
                $viewName = $matches[1] ?? 'inconnue';
                echo "✅ Vue '$viewName' créée avec succès.\n";
            } elseif (strpos($query, 'INSERT') !== false) {
                echo "✅ Données par défaut insérées.\n";
            } elseif (strpos($query, 'CREATE INDEX') !== false) {
                echo "✅ Index créé.\n";
            }
            
        } catch (PDOException $e) {
            $errorCount++;
            echo "❌ Erreur lors de l'exécution d'une requête: " . $e->getMessage() . "\n";
            echo "   Requête: " . substr($query, 0, 100) . "...\n\n";
        }
    }
    
    echo "\n" . str_repeat("=", 50) . "\n";
    echo "📊 Résumé de l'installation:\n";
    echo "   ✅ Requêtes réussies: $successCount\n";
    echo "   ❌ Requêtes échouées: $errorCount\n";
    
    if ($errorCount === 0) {
        echo "\n🎉 Installation terminée avec succès!\n";
        echo "   👤 Utilisateur admin créé:\n";
        echo "      - Nom d'utilisateur: admin\n";
        echo "      - Email: admin@musicstream.com\n";
        echo "      - Mot de passe: password (à changer!)\n\n";
        
        // Vérifier les tables créées
        echo "🔍 Vérification des tables créées:\n";
        $stmt = $pdo->query("SHOW TABLES");
        $tables = $stmt->fetchAll(PDO::FETCH_COLUMN);
        
        $expectedTables = ['player', 'music', 'playlists', 'playlist_tracks', 'favorites', 'user_sessions', 'activity_logs'];
        
        foreach ($expectedTables as $table) {
            if (in_array($table, $tables)) {
                echo "   ✅ $table\n";
            } else {
                echo "   ❌ $table (manquante)\n";
            }
        }
        
        // Créer les dossiers nécessaires
        echo "\n📁 Création des dossiers nécessaires:\n";
        $directories = [MUSIC_DIR, COVERS_DIR];
        
        foreach ($directories as $dir) {
            if (!is_dir($dir)) {
                if (mkdir($dir, 0755, true)) {
                    echo "   ✅ Dossier '$dir' créé.\n";
                } else {
                    echo "   ❌ Impossible de créer le dossier '$dir'.\n";
                }
            } else {
                echo "   ✅ Dossier '$dir' existe déjà.\n";
            }
        }
        
        // Créer un fichier .htaccess pour protéger les fichiers de configuration
        $htaccess = "# Protection des fichiers de configuration\n";
        $htaccess .= "<Files \"config.php\">\n";
        $htaccess .= "    Order allow,deny\n";
        $htaccess .= "    Deny from all\n";
        $htaccess .= "</Files>\n\n";
        $htaccess .= "<Files \"setup_database.php\">\n";
        $htaccess .= "    Order allow,deny\n";
        $htaccess .= "    Deny from all\n";
        $htaccess .= "</Files>\n";
        
        if (file_put_contents('.htaccess', $htaccess)) {
            echo "   ✅ Fichier .htaccess créé pour la sécurité.\n";
        }
        
    } else {
        echo "\n⚠️  Installation terminée avec des erreurs.\n";
        echo "   Vérifiez les messages d'erreur ci-dessus.\n";
    }
    
} catch (Exception $e) {
    echo "❌ Erreur fatale: " . $e->getMessage() . "\n";
    exit(1);
}

echo "\n🔒 IMPORTANT: Supprimez ce fichier après l'installation pour des raisons de sécurité!\n";
echo "   rm setup_database.php\n\n";
?>