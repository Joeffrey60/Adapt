<?php
// Configuration de la base de données pour MusicStream Pro
$host = '185.207.226.9';
$dbname = 'nihcjh_nexiumsu_db';
$username = 'nihcjh_nexiumsu_db';
$password = 'T_9xO82n!sW0%-Xp';

try {
    $pdo = new PDO("mysql:host=$host;dbname=$dbname;charset=utf8mb4", $username, $password);
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
    $pdo->setAttribute(PDO::ATTR_DEFAULT_FETCH_MODE, PDO::FETCH_ASSOC);
} catch(PDOException $e) {
    die("Erreur de connexion : " . $e->getMessage());
}

// Configuration des chemins
define('MUSIC_DIR', 'music/');
define('COVERS_DIR', 'covers/');
define('MAX_FILE_SIZE', 10 * 1024 * 1024); // 10MB

// Configuration de sécurité
define('ALLOWED_AUDIO_TYPES', ['audio/mpeg', 'audio/wav', 'audio/ogg', 'audio/mp4']);
define('ALLOWED_AUDIO_EXTENSIONS', ['mp3', 'wav', 'ogg', 'm4a']);

// Démarrer la session
if (session_status() === PHP_SESSION_NONE) {
    session_start();
}

// Fonction pour vérifier l'authentification
function checkAuth() {
    global $pdo;
    
    if (!isset($_SESSION['user_id'])) {
        return false;
    }
    
    try {
        $stmt = $pdo->prepare("SELECT * FROM player WHERE id = ? AND is_active = 1");
        $stmt->execute([$_SESSION['user_id']]);
        $user = $stmt->fetch();
        
        if ($user) {
            // Mettre à jour la dernière activité
            $updateStmt = $pdo->prepare("UPDATE player SET last_active = NOW() WHERE id = ?");
            $updateStmt->execute([$user['id']]);
        }
        
        return $user;
    } catch (PDOException $e) {
        error_log("Erreur checkAuth: " . $e->getMessage());
        return false;
    }
}

// Fonction pour obtenir l'utilisateur actuel
function getCurrentUser() {
    $user = checkAuth();
    if (!$user) {
        throw new Exception('Utilisateur non authentifié');
    }
    return $user;
}

// Fonction pour formater la taille des fichiers
function formatFileSize($bytes) {
    if ($bytes >= 1073741824) {
        return number_format($bytes / 1073741824, 2) . ' GB';
    } elseif ($bytes >= 1048576) {
        return number_format($bytes / 1048576, 2) . ' MB';
    } elseif ($bytes >= 1024) {
        return number_format($bytes / 1024, 2) . ' KB';
    } else {
        return $bytes . ' bytes';
    }
}

// Fonction pour formater la durée
function formatDuration($seconds) {
    if ($seconds < 60) {
        return "0:" . str_pad($seconds, 2, '0', STR_PAD_LEFT);
    }
    
    $minutes = floor($seconds / 60);
    $seconds = $seconds % 60;
    
    if ($minutes < 60) {
        return $minutes . ":" . str_pad($seconds, 2, '0', STR_PAD_LEFT);
    }
    
    $hours = floor($minutes / 60);
    $minutes = $minutes % 60;
    
    return $hours . ":" . str_pad($minutes, 2, '0', STR_PAD_LEFT) . ":" . str_pad($seconds, 2, '0', STR_PAD_LEFT);
}

// Fonction pour générer un nom de fichier unique
function generateUniqueFileName($originalName) {
    $extension = pathinfo($originalName, PATHINFO_EXTENSION);
    return uniqid() . '.' . $extension;
}

// Fonction pour valider un fichier audio
function validateAudioFile($file) {
    $errors = [];
    
    // Vérifier la taille
    if ($file['size'] > MAX_FILE_SIZE) {
        $errors[] = "Le fichier est trop volumineux. Taille maximale: " . formatFileSize(MAX_FILE_SIZE);
    }
    
    // Vérifier le type MIME
    if (!in_array($file['type'], ALLOWED_AUDIO_TYPES)) {
        $errors[] = "Type de fichier non autorisé. Types acceptés: " . implode(', ', ALLOWED_AUDIO_TYPES);
    }
    
    // Vérifier l'extension
    $extension = strtolower(pathinfo($file['name'], PATHINFO_EXTENSION));
    if (!in_array($extension, ALLOWED_AUDIO_EXTENSIONS)) {
        $errors[] = "Extension de fichier non autorisée. Extensions acceptées: " . implode(', ', ALLOWED_AUDIO_EXTENSIONS);
    }
    
    return $errors;
}

// Fonction pour enregistrer une activité
function logActivity($action, $targetType = null, $targetId = null, $details = null) {
    global $pdo;
    
    try {
        $user = checkAuth();
        $userId = $user ? $user['id'] : null;
        
        $stmt = $pdo->prepare("
            INSERT INTO activity_logs (user_id, action, target_type, target_id, details, ip_address, user_agent) 
            VALUES (?, ?, ?, ?, ?, ?, ?)
        ");
        
        $stmt->execute([
            $userId,
            $action,
            $targetType,
            $targetId,
            $details ? json_encode($details) : null,
            $_SERVER['REMOTE_ADDR'] ?? null,
            $_SERVER['HTTP_USER_AGENT'] ?? null
        ]);
    } catch (PDOException $e) {
        error_log("Erreur logActivity: " . $e->getMessage());
    }
}

// Fonction pour nettoyer les entrées utilisateur
function sanitizeInput($input) {
    return htmlspecialchars(trim($input), ENT_QUOTES, 'UTF-8');
}

// Fonction pour générer une réponse JSON
function jsonResponse($data, $httpCode = 200) {
    http_response_code($httpCode);
    header('Content-Type: application/json; charset=utf-8');
    echo json_encode($data, JSON_UNESCAPED_UNICODE);
    exit;
}

// Fonction pour générer une réponse d'erreur JSON
function jsonError($message, $httpCode = 400) {
    jsonResponse(['error' => $message], $httpCode);
}

// Configuration des emojis de couverture par défaut
$coverEmojis = ['🎵', '🎸', '🎤', '🎧', '🎼', '🎹', '🎺', '🎷', '🥁', '🎻', '🎬', '🎭', '🎨', '🎪', '🎯'];

// Fonction pour obtenir un emoji de couverture aléatoire
function getRandomCoverEmoji() {
    global $coverEmojis;
    return $coverEmojis[array_rand($coverEmojis)];
}
?>