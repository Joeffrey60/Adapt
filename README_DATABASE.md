# 🎵 MusicStream Pro - Installation de la Base de Données

## 📋 Prérequis

- Serveur web avec PHP 7.4+ 
- MySQL 5.7+ ou MariaDB 10.2+
- Extension PDO MySQL activée

## 🚀 Installation Rapide

### Méthode 1: Script PHP Automatique (Recommandé)

1. **Téléchargez les fichiers nécessaires** dans votre dossier web :
   - `config.php` (configuration de la base de données)
   - `create_tables.sql` (script SQL des tables)
   - `setup_database.php` (script d'installation automatique)

2. **Exécutez le script d'installation** :
   ```bash
   php setup_database.php
   ```
   
   Ou via navigateur web :
   ```
   http://votre-domaine.com/setup_database.php
   ```

3. **Supprimez le fichier d'installation** pour la sécurité :
   ```bash
   rm setup_database.php
   ```

### Méthode 2: Installation Manuelle SQL

1. **Connectez-vous à votre base de données MySQL** :
   ```bash
   mysql -h 185.207.226.9 -u nihcjh_nexiumsu_db -p nihcjh_nexiumsu_db
   ```

2. **Exécutez le script SQL** :
   ```sql
   source create_tables.sql;
   ```

## 📊 Tables Créées

Le script créera les tables suivantes :

| Table | Description |
|-------|-------------|
| `player` | Utilisateurs de l'application |
| `music` | Bibliothèque musicale |
| `playlists` | Playlists des utilisateurs |
| `playlist_tracks` | Liaison playlist-musique |
| `favorites` | Favoris des utilisateurs |
| `user_sessions` | Sessions utilisateur (optionnel) |
| `activity_logs` | Logs d'activité (optionnel) |

## 👤 Compte Administrateur par Défaut

Un compte administrateur est créé automatiquement :

- **Nom d'utilisateur** : `admin`
- **Email** : `admin@musicstream.com`
- **Mot de passe** : `password`

⚠️ **IMPORTANT** : Changez ce mot de passe dès la première connexion !

## 📁 Structure des Dossiers

Le script créera automatiquement ces dossiers :

```
votre-projet/
├── music/          # Fichiers audio uploadés
├── covers/         # Images de couverture (futur)
├── config.php      # Configuration (protégé par .htaccess)
└── .htaccess       # Protection des fichiers sensibles
```

## 🔧 Configuration de la Base de Données

Vos paramètres actuels dans `config.php` :

```php
$host = '185.207.226.9';
$dbname = 'nihcjh_nexiumsu_db';
$username = 'nihcjh_nexiumsu_db';
$password = 'T_9xO82n!sW0%-Xp';
```

## ✅ Vérification de l'Installation

Après l'installation, vérifiez que tout fonctionne :

1. **Vérifiez les tables** :
   ```sql
   SHOW TABLES;
   ```

2. **Vérifiez le compte admin** :
   ```sql
   SELECT * FROM player WHERE role = 'admin';
   ```

3. **Testez la connexion** depuis votre application PHP :
   ```php
   require_once 'config.php';
   $user = checkAuth(); // Devrait retourner false si non connecté
   ```

## 🛠️ Dépannage

### Erreur de connexion
- Vérifiez les paramètres de connexion dans `config.php`
- Assurez-vous que MySQL est démarré
- Vérifiez les permissions de l'utilisateur de base de données

### Tables non créées
- Vérifiez les permissions de l'utilisateur de base de données
- Regardez les logs d'erreur PHP/MySQL
- Exécutez le script SQL manuellement

### Problèmes de permissions
- Assurez-vous que les dossiers `music/` et `covers/` sont accessibles en écriture
- Vérifiez les permissions du serveur web

## 🔒 Sécurité

- Le fichier `.htaccess` protège `config.php` et `setup_database.php`
- Supprimez `setup_database.php` après installation
- Changez le mot de passe admin par défaut
- Configurez des mots de passe forts pour la base de données

## 📞 Support

Si vous rencontrez des problèmes :

1. Vérifiez les logs d'erreur PHP
2. Consultez les logs MySQL
3. Assurez-vous que toutes les extensions PHP requises sont installées

---

🎵 **MusicStream Pro** - Votre plateforme de streaming musical personnelle !