// Configuration
const API_BASE = 'api.php';

// Variables globales
let musicLibrary = [];
let playlists = [];
let favorites = [];
let currentTrack = null;
let isPlaying = false;
let audioPlayer = null;
let selectedFile = null;
let currentUser = null;
let userSession = null; // Add proper session management

// Initialisation
document.addEventListener('DOMContentLoaded', function() {
    audioPlayer = document.getElementById('audioPlayer');
    setupAudioPlayer();
    setupUploadArea();
    setupSearch();
    checkAuthentication();
});

// Configuration du lecteur audio
function setupAudioPlayer() {
    audioPlayer.addEventListener('loadedmetadata', function() {
        console.log('Audio loaded:', currentTrack?.title);
    });

    audioPlayer.addEventListener('ended', function() {
        nextTrack();
    });

    audioPlayer.addEventListener('error', function(e) {
        console.error('Erreur audio:', e);
        showNotification('Erreur de lecture audio', 'error');
    });

    audioPlayer.addEventListener('timeupdate', function() {
        // Ici vous pouvez ajouter une barre de progression
    });
}

// Vérification de l'authentification
async function checkAuthentication() {
    try {
        const response = await fetch(`${API_BASE}?action=check_auth`);
        const data = await response.json();
        
        if (data.authenticated) {
            currentUser = data.user;
            userSession = data.user.session_id || data.session_id || null; // Set session properly
            updateUserInterface();
            await loadAllData();
        } else {
            // Rediriger vers votre page de connexion existante
            showNotification('Veuillez vous connecter pour accéder à l\'application', 'error');
            // Vous pouvez personnaliser cette redirection selon votre page de connexion
            setTimeout(() => {
                alert('Veuillez vous connecter via votre système d\'authentification existant');
            }, 2000);
        }
    } catch (error) {
        console.error('Erreur d\'authentification:', error);
        showNotification('Erreur de connexion au serveur', 'error');
    }
}

// Mise à jour de l'interface utilisateur
function updateUserInterface() {
    if (!currentUser) return;
    
    // Mettre à jour les informations utilisateur
    const userInfoElement = document.getElementById('userInfo');
    const userNameElement = document.getElementById('userName');
    const userRoleElement = document.getElementById('userRole');
    
    if (userInfoElement) userInfoElement.textContent = `Bienvenue, ${currentUser.username}`;
    if (userNameElement) userNameElement.textContent = currentUser.username;
    if (userRoleElement) userRoleElement.textContent = currentUser.role;
    
    // Ajouter la classe admin si nécessaire
    if (userRoleElement && currentUser.role === 'admin') {
        userRoleElement.classList.add('admin');
    }
    
    // Afficher/masquer l'onglet Admin selon le rôle
    const adminTab = document.querySelector('[onclick="showSection(\'admin\')"]');
    if (adminTab && currentUser.role !== 'admin') {
        adminTab.style.display = 'none';
    }
    
    // Mettre à jour l'avatar si disponible
    const userAvatarElement = document.getElementById('userAvatar');
    if (userAvatarElement && currentUser.avatar_url) {
        userAvatarElement.innerHTML = `<img src="${currentUser.avatar_url}" alt="Avatar" style="width: 100%; height: 100%; border-radius: 50%;">`;
    }
}

// Chargement de toutes les données
async function loadAllData() {
    try {
        await Promise.all([
            loadMusic(),
            loadPlaylists(),
            loadFavorites()
        ]);
        
        updateHomeSection();
        updateLibraryStats();
    } catch (error) {
        console.error('Erreur lors du chargement:', error);
        if (error.message && error.message.includes('Authentification requise')) {
            window.location.href = 'login.php';
        } else {
            showNotification('Erreur lors du chargement des données', 'error');
        }
    }
}

// Chargement de la musique depuis l'API
async function loadMusic() {
    try {
        const response = await fetch(`${API_BASE}?action=get_music`);
        const data = await response.json();
        
        if (response.ok) {
            musicLibrary = data;
            console.log('Musiques chargées:', musicLibrary.length);
        } else {
            throw new Error(data.error || 'Erreur lors du chargement');
        }
    } catch (error) {
        console.error('Erreur loadMusic:', error);
        musicLibrary = [];
    }
}

// Chargement des playlists
async function loadPlaylists() {
    try {
        const response = await fetch(`${API_BASE}?action=get_playlists`);
        const data = await response.json();
        
        if (response.ok) {
            playlists = data;
            updatePlaylistsDisplay();
        } else {
            throw new Error(data.error || 'Erreur lors du chargement des playlists');
        }
    } catch (error) {
        console.error('Erreur loadPlaylists:', error);
        playlists = [];
        // Don't show error for initial load failures
        if (!error.message.includes('400')) {
            showNotification('Erreur lors du chargement des playlists', 'error');
        }
    }
}

// Chargement des favoris
async function loadFavorites() {
    try {
        // Use proper session management instead of undefined USER_SESSION
        const sessionParam = userSession || (currentUser ? currentUser.session_id : '');
        const response = await fetch(`${API_BASE}?action=get_favorites${sessionParam ? `&session=${sessionParam}` : ''}`);
        const data = await response.json();
        
        if (response.ok) {
            favorites = data.map(f => f.id);
            updateFavoritesDisplay();
        } else {
            throw new Error(data.error || 'Erreur lors du chargement des favoris');
        }
    } catch (error) {
        console.error('Erreur loadFavorites:', error);
        favorites = [];
        // Don't show error notification for session-related issues during initial load
        if (!error.message.includes('session') && !error.message.includes('Authentification')) {
            showNotification('Erreur lors du chargement des favoris', 'error');
        }
    }
}

// Navigation entre sections
function showSection(sectionName) {
    // Masquer toutes les sections
    document.querySelectorAll('.section').forEach(section => {
        section.classList.remove('active');
    });
    
    // Désactiver tous les onglets
    document.querySelectorAll('.nav-tab').forEach(tab => {
        tab.classList.remove('active');
    });
    
    // Afficher la section sélectionnée
    const targetSection = document.getElementById(sectionName);
    if (targetSection) {
        targetSection.classList.add('active');
    }
    
    // Activer l'onglet correspondant
    if (event && event.target) {
        event.target.classList.add('active');
    }

    // Charger les données spécifiques à la section
    switch(sectionName) {
        case 'admin':
            loadAdminData();
            break;
        case 'favoris':
            loadFavorites();
            break;
        case 'playlists':
            loadPlaylists();
            break;
    }
}

// Mise à jour de la section d'accueil
function updateHomeSection() {
    const nouveautesContainer = document.getElementById('nouveautes-list');
    const suggestionsContainer = document.getElementById('suggestions-list');
    
    if (!nouveautesContainer || !suggestionsContainer) return;
    
    // Nouveautés (3 dernières musiques)
    const nouveautes = musicLibrary.slice(0, 3);
    nouveautesContainer.innerHTML = '';
    
    if (nouveautes.length === 0) {
        nouveautesContainer.innerHTML = '<div class="loading"><p>Aucune musique disponible</p></div>';
    } else {
        nouveautes.forEach(music => {
            nouveautesContainer.appendChild(createMusicCard(music));
        });
    }
    
    // Suggestions (musiques aléatoires)
    const suggestions = musicLibrary.slice(3, 6);
    suggestionsContainer.innerHTML = '';
    
    if (suggestions.length === 0) {
        suggestionsContainer.innerHTML = '<div class="loading"><p>Aucune suggestion disponible</p></div>';
    } else {
        suggestions.forEach(music => {
            suggestionsContainer.appendChild(createMusicCard(music));
        });
    }
}

// Création d'une carte musique
function createMusicCard(music) {
    const card = document.createElement('div');
    card.className = 'music-card';
    card.innerHTML = `
        <div class="music-info">
            <div class="music-cover">${music.cover_emoji || '🎵'}</div>
            <div class="music-details">
                <h3>${music.title}</h3>
                <p>${music.artist} • ${music.duration || 'N/A'}</p>
            </div>
        </div>
        <div class="music-actions">
            <button class="btn btn-primary" onclick="playMusic(${music.id})">▶ Lire</button>
            <button class="favorite-btn ${favorites.includes(music.id) ? 'active' : ''}" onclick="toggleFavorite(${music.id})">♡</button>
            <button class="btn btn-secondary" onclick="addToPlaylistPrompt(${music.id})">+ Playlist</button>
        </div>
    `;
    return card;
}

// Lecture d'une musique
async function playMusic(musicId) {
    const music = musicLibrary.find(m => m.id == musicId);
    if (!music) {
        showNotification('Musique non trouvée', 'error');
        return;
    }

    try {
        currentTrack = music;
        // Fix potential double path issue
        const audioUrl = music.file_url.startsWith('http') ? music.file_url : `${window.location.origin}/${music.file_url}`;
        audioPlayer.src = audioUrl;
        
        // Attendre que l'audio soit prêt
        await new Promise((resolve, reject) => {
            const onCanPlay = () => {
                audioPlayer.removeEventListener('canplay', onCanPlay);
                audioPlayer.removeEventListener('error', onError);
                resolve();
            };
            const onError = (e) => {
                audioPlayer.removeEventListener('canplay', onCanPlay);
                audioPlayer.removeEventListener('error', onError);
                reject(e);
            };
            
            audioPlayer.addEventListener('canplay', onCanPlay);
            audioPlayer.addEventListener('error', onError);
            audioPlayer.load();
        });

        await audioPlayer.play();
        isPlaying = true;
        
        updateNowPlaying();
        updatePlayButton();
        
        // Animation
        const currentCover = document.getElementById('currentCover');
        if (currentCover) {
            currentCover.style.transform = 'scale(1.1)';
            setTimeout(() => {
                currentCover.style.transform = 'scale(1)';
            }, 200);
        }
        
        showNotification(`Lecture: ${music.title}`, 'success');
        
    } catch (error) {
        console.error('Erreur lors de la lecture:', error);
        showNotification('Erreur lors de la lecture - Fichier audio introuvable', 'error');
        isPlaying = false;
        updatePlayButton();
    }
}

// Mise à jour du lecteur
function updateNowPlaying() {
    if (currentTrack) {
        const currentTitle = document.getElementById('currentTitle');
        const currentArtist = document.getElementById('currentArtist');
        const currentCover = document.getElementById('currentCover');
        const favoriteBtn = document.getElementById('currentFavorite');
        
        if (currentTitle) currentTitle.textContent = currentTrack.title;
        if (currentArtist) currentArtist.textContent = currentTrack.artist;
        if (currentCover) currentCover.textContent = currentTrack.cover_emoji || '🎵';
        
        if (favoriteBtn) {
            favoriteBtn.textContent = favorites.includes(currentTrack.id) ? '♥' : '♡';
            favoriteBtn.className = favorites.includes(currentTrack.id) ? 'favorite-btn active' : 'favorite-btn';
        }
    }
}

// Contrôles du lecteur
async function togglePlayPause() {
    if (!currentTrack) {
        showNotification('Sélectionnez d\'abord une musique !', 'error');
        return;
    }
    
    try {
        if (isPlaying) {
            audioPlayer.pause();
            isPlaying = false;
        } else {
            await audioPlayer.play();
            isPlaying = true;
        }
        updatePlayButton();
    } catch (error) {
        console.error('Erreur toggle play/pause:', error);
        showNotification('Erreur de lecture - Vérifiez le fichier audio', 'error');
    }
}

function updatePlayButton() {
    const btn = document.getElementById('playPauseBtn');
    if (btn) {
        btn.textContent = isPlaying ? '⏸' : '▶';
    }
}

function previousTrack() {
    if (currentTrack && musicLibrary.length > 0) {
        const currentIndex = musicLibrary.findIndex(m => m.id == currentTrack.id);
        const prevIndex = currentIndex > 0 ? currentIndex - 1 : musicLibrary.length - 1;
        playMusic(musicLibrary[prevIndex].id);
    }
}

function nextTrack() {
    if (currentTrack && musicLibrary.length > 0) {
        const currentIndex = musicLibrary.findIndex(m => m.id == currentTrack.id);
        const nextIndex = currentIndex < musicLibrary.length - 1 ? currentIndex + 1 : 0;
        playMusic(musicLibrary[nextIndex].id);
    }
}

// Gestion des favoris
async function toggleFavorite(musicId) {
    try {
        const formData = new FormData();
        formData.append('music_id', musicId);
        // Use proper session management
        const sessionParam = userSession || (currentUser ? currentUser.session_id : '');
        if (sessionParam) {
            formData.append('session', sessionParam);
        }
        
        const response = await fetch(`${API_BASE}?action=toggle_favorite`, {
            method: 'POST',
            body: formData
        });
        
        const data = await response.json();
        
        if (response.ok) {
            if (data.action === 'added') {
                favorites.push(parseInt(musicId));
                showNotification('Ajouté aux favoris', 'success');
            } else {
                favorites = favorites.filter(id => id != musicId);
                showNotification('Retiré des favoris', 'success');
            }
            
            updateFavoriteButtons();
            if (currentTrack && currentTrack.id == musicId) {
                updateNowPlaying();
            }
            
            // Recharger les favoris si on est sur cette section
            const favorisSection = document.getElementById('favoris');
            if (favorisSection && favorisSection.classList.contains('active')) {
                loadFavorites();
            }
        } else {
            throw new Error(data.error);
        }
    } catch (error) {
        console.error('Erreur toggle favorite:', error);
        showNotification('Erreur lors de la mise à jour des favoris', 'error');
    }
}

function toggleCurrentFavorite() {
    if (currentTrack) {
        toggleFavorite(currentTrack.id);
    }
}

function updateFavoriteButtons() {
    document.querySelectorAll('.favorite-btn').forEach(btn => {
        const onclick = btn.getAttribute('onclick');
        if (onclick) {
            const musicId = parseInt(onclick.match(/\d+/)?.[0]);
            if (musicId) {
                btn.textContent = favorites.includes(musicId) ? '♥' : '♡';
                btn.className = favorites.includes(musicId) ? 'favorite-btn active' : 'favorite-btn';
            }
        }
    });
}

async function updateFavoritesDisplay() {
    const container = document.getElementById('favoritesList');
    if (!container) return;
    
    try {
        const sessionParam = userSession || (currentUser ? currentUser.session_id : '');
        const response = await fetch(`${API_BASE}?action=get_favorites${sessionParam ? `&session=${sessionParam}` : ''}`);
        const favoriteMusics = await response.json();
        
        container.innerHTML = '';
        if (favoriteMusics.length === 0) {
            container.innerHTML = '<div class="loading"><p>Aucun favori pour le moment</p></div>';
        } else {
            favoriteMusics.forEach(music => {
                container.appendChild(createMusicCard(music));
            });
        }
    } catch (error) {
        console.error('Erreur updateFavoritesDisplay:', error);
        container.innerHTML = '<div class="loading"><p>Erreur lors du chargement</p></div>';
    }
}

// Recherche
function setupSearch() {
    const searchInput = document.getElementById('searchInput');
    if (!searchInput) return;
    
    let searchTimeout;
    
    searchInput.addEventListener('input', function() {
        const query = this.value.toLowerCase().trim();
        const container = document.getElementById('searchResults');
        if (!container) return;
        
        // Annuler la recherche précédente
        clearTimeout(searchTimeout);
        
        if (query.length === 0) {
            container.innerHTML = '<div class="loading"><p>Tapez pour rechercher...</p></div>';
            return;
        }
        
        if (query.length < 2) {
            return;
        }
        
        // Délai pour éviter trop de requêtes
        searchTimeout = setTimeout(async () => {
            try {
                const response = await fetch(`${API_BASE}?action=search&q=${encodeURIComponent(query)}`);
                const results = await response.json();
                
                container.innerHTML = '';
                
                if (results.length === 0) {
                    container.innerHTML = '<div class="loading"><p>Aucun résultat trouvé</p></div>';
                } else {
                    results.forEach(music => {
                        container.appendChild(createMusicCard(music));
                    });
                }
            } catch (error) {
                console.error('Erreur recherche:', error);
                container.innerHTML = '<div class="loading"><p>Erreur lors de la recherche</p></div>';
            }
        }, 300);
    });
}

// Gestion des playlists
async function updatePlaylistsDisplay() {
    const container = document.getElementById('playlistsList');
    if (!container) return;
    
    container.innerHTML = '';
    
    if (playlists.length === 0) {
        container.innerHTML = '<div class="loading"><p>Aucune playlist créée</p></div>';
        return;
    }
    
    playlists.forEach(playlist => {
        const playlistElement = document.createElement('div');
        playlistElement.className = 'playlist-card';
        playlistElement.innerHTML = `
            <div style="display: flex; align-items: center; justify-content: space-between;">
                <div style="display: flex; align-items: center;">
                    <div style="font-size: 30px; margin-right: 15px;">${playlist.icon || '🎵'}</div>
                    <div>
                        <h3>${playlist.name}</h3>
                        <p style="color: rgba(255,255,255,0.7); font-size: 14px;">
                            ${playlist.track_count || 0} musique(s) • ${playlist.description || 'Playlist personnalisée'}
                        </p>
                    </div>
                </div>
                <button class="btn btn-danger" onclick="deletePlaylist(${playlist.id})" style="padding: 5px 10px;">×</button>
            </div>
        `;
        
        playlistElement.onclick = function(e) {
            if (!e.target.classList.contains('btn')) {
                showPlaylistTracks(playlist.id);
            }
        };
        
        container.appendChild(playlistElement);
    });
}

async function createPlaylist() {
    const name = prompt('Nom de la playlist :');
    if (!name || !name.trim()) return;
    
    const description = prompt('Description (optionnel) :') || '';
    const icons = ['🎵', '🎸', '🎤', '🎧', '🎼', '🎹', '🎺', '🎷', '🥁', '🎻'];
    const randomIcon = icons[Math.floor(Math.random() * icons.length)];
    
    try {
        const formData = new FormData();
        formData.append('name', name.trim());
        formData.append('description', description);
        formData.append('icon', randomIcon);
        
        const response = await fetch(`${API_BASE}?action=create_playlist`, {
            method: 'POST',
            body: formData
        });
        
        const data = await response.json();
        
        if (response.ok) {
            showNotification(`Playlist "${name}" créée !`, 'success');
            loadPlaylists();
        } else {
            throw new Error(data.error);
        }
    } catch (error) {
        console.error('Erreur création playlist:', error);
        showNotification('Erreur lors de la création de la playlist', 'error');
    }
}

async function deletePlaylist(playlistId) {
    if (!confirm('Supprimer cette playlist ?')) return;
    
    try {
        const formData = new FormData();
        formData.append('id', playlistId);
        
        const response = await fetch(`${API_BASE}?action=delete_playlist`, {
            method: 'POST',
            body: formData
        });
        
        const data = await response.json();
        
        if (response.ok) {
            showNotification('Playlist supprimée', 'success');
            loadPlaylists();
        } else {
            throw new Error(data.error);
        }
    } catch (error) {
        console.error('Erreur suppression playlist:', error);
        showNotification('Erreur lors de la suppression', 'error');
    }
}

// Configuration de la zone d'upload
function setupUploadArea() {
    const uploadArea = document.getElementById('uploadArea');
    const fileInput = document.getElementById('fileInput');
    const uploadForm = document.getElementById('uploadForm');
    
    if (!uploadArea || !uploadForm) return;
    
    // Drag & Drop
    uploadArea.addEventListener('dragover', function(e) {
        e.preventDefault();
        uploadArea.classList.add('dragover');
    });
    
    uploadArea.addEventListener('dragleave', function(e) {
        e.preventDefault();
        uploadArea.classList.remove('dragover');
    });
    
    uploadArea.addEventListener('drop', function(e) {
        e.preventDefault();
        uploadArea.classList.remove('dragover');
        
        const files = e.dataTransfer.files;
        if (files.length > 0) {
            handleFileSelect(files[0]);
        }
    });
    
    // Soumission du formulaire
    uploadForm.addEventListener('submit', function(e) {
        e.preventDefault();
        uploadMusic();
    });
}

// Gestion de la sélection de fichier
function handleFileSelect(file) {
    if (!file) return;
    
    // Vérifier le type de fichier
    const allowedTypes = ['audio/mpeg', 'audio/wav', 'audio/ogg'];
    if (!allowedTypes.includes(file.type)) {
        showNotification('Format de fichier non supporté', 'error');
        return;
    }
    
    // Vérifier la taille (10MB max)
    if (file.size > 10 * 1024 * 1024) {
        showNotification('Fichier trop volumineux (max 10MB)', 'error');
        return;
    }
    
    selectedFile = file;
    
    // Afficher les informations du fichier
    const fileInfo = document.getElementById('fileInfo');
    const fileName = document.getElementById('fileName');
    const fileDetails = document.getElementById('fileDetails');
    
    if (fileName) fileName.textContent = file.name;
    if (fileDetails) fileDetails.textContent = `Taille: ${formatFileSize(file.size)} • Type: ${file.type}`;
    if (fileInfo) fileInfo.style.display = 'block';
    
    // Essayer d'extraire les métadonnées du nom de fichier
    const nameWithoutExt = file.name.replace(/\.[^/.]+$/, "");
    const parts = nameWithoutExt.split(' - ');
    
    const musicArtist = document.getElementById('musicArtist');
    const musicTitle = document.getElementById('musicTitle');
    
    if (parts.length >= 2) {
        if (musicArtist) musicArtist.value = parts[0].trim();
        if (musicTitle) musicTitle.value = parts[1].trim();
    } else {
        if (musicTitle) musicTitle.value = nameWithoutExt;
    }
}

// Upload de la musique
async function uploadMusic() {
    if (!selectedFile) {
        showNotification('Sélectionnez d\'abord un fichier', 'error');
        return;
    }
    
    const musicTitle = document.getElementById('musicTitle');
    const musicArtist = document.getElementById('musicArtist');
    const musicAlbum = document.getElementById('musicAlbum');
    const musicGenre = document.getElementById('musicGenre');
    
    const title = musicTitle ? musicTitle.value.trim() : '';
    const artist = musicArtist ? musicArtist.value.trim() : '';
    const album = musicAlbum ? musicAlbum.value.trim() : '';
    const genre = musicGenre ? musicGenre.value : '';
    
    if (!title || !artist) {
        showNotification('Titre et artiste sont requis', 'error');
        return;
    }
    
    const formData = new FormData();
    formData.append('music_file', selectedFile);
    formData.append('title', title);
    formData.append('artist', artist);
    formData.append('album', album || 'Single');
    formData.append('genre', genre);
    
    // Afficher la barre de progression
    const progressBar = document.getElementById('progressBar');
    const progressFill = document.getElementById('progressFill');
    if (progressBar) progressBar.style.display = 'block';
    
    try {
        const response = await fetch(`${API_BASE}?action=upload`, {
            method: 'POST',
            body: formData
        });
        
        const data = await response.json();
        
        if (response.ok) {
            showNotification('Musique uploadée avec succès !', 'success');
            
            // Réinitialiser le formulaire
            const uploadForm = document.getElementById('uploadForm');
            const fileInfo = document.getElementById('fileInfo');
            if (uploadForm) uploadForm.reset();
            if (fileInfo) fileInfo.style.display = 'none';
            selectedFile = null;
            
            // Recharger les données
            await loadAllData();
            
        } else {
            throw new Error(data.error);
        }
    } catch (error) {
        console.error('Erreur upload:', error);
        showNotification('Erreur lors de l\'upload: ' + error.message, 'error');
    } finally {
        if (progressBar) progressBar.style.display = 'none';
        if (progressFill) progressFill.style.width = '0%';
    }
}

// Chargement des données admin
async function loadAdminData() {
    await loadMusic();
    updateAdminMusicList();
    updateLibraryStats();
}

// Mise à jour de la liste admin
function updateAdminMusicList() {
    const container = document.getElementById('adminMusicList');
    if (!container) return;
    
    container.innerHTML = '';
    
    if (musicLibrary.length === 0) {
        container.innerHTML = '<div class="loading"><p>Aucune musique dans la bibliothèque</p></div>';
        return;
    }
    
    musicLibrary.forEach(music => {
        const musicElement = document.createElement('div');
        musicElement.className = 'admin-music-card';
        musicElement.innerHTML = `
            <div class="admin-music-info">
                <h4>${music.title}</h4>
                <p>${music.artist} • ${music.album || 'N/A'} • ${music.file_size_formatted || 'N/A'}</p>
            </div>
            <div class="admin-actions">
                <button class="btn btn-primary" onclick="playMusic(${music.id})" style="padding: 5px 10px;">▶</button>
                <button class="btn btn-danger" onclick="deleteMusic(${music.id})" style="padding: 5px 10px;">🗑️</button>
            </div>
        `;
        container.appendChild(musicElement);
    });
}

// Suppression d'une musique
async function deleteMusic(musicId) {
    if (!confirm('Supprimer définitivement cette musique ?')) return;
    
    try {
        const formData = new FormData();
        formData.append('id', musicId);
        
        const response = await fetch(`${API_BASE}?action=delete_music`, {
            method: 'POST',
            body: formData
        });
        
        const data = await response.json();
        
        if (response.ok) {
            showNotification('Musique supprimée', 'success');
            await loadAllData();
        } else {
            throw new Error(data.error);
        }
    } catch (error) {
        console.error('Erreur suppression musique:', error);
        showNotification('Erreur lors de la suppression', 'error');
    }
}

// Mise à jour des statistiques
function updateLibraryStats() {
    const totalTracksElement = document.getElementById('totalTracks');
    const totalSizeElement = document.getElementById('totalSize');
    const totalGenresElement = document.getElementById('totalGenres');
    
    const totalTracks = musicLibrary.length;
    const totalSize = musicLibrary.reduce((sum, music) => sum + (music.file_size || 0), 0);
    const genres = [...new Set(musicLibrary.map(music => music.genre).filter(Boolean))];
    
    if (totalTracksElement) totalTracksElement.textContent = totalTracks;
    if (totalSizeElement) totalSizeElement.textContent = formatFileSize(totalSize);
    if (totalGenresElement) totalGenresElement.textContent = genres.length;
}

// Actualiser la bibliothèque
async function refreshLibrary() {
    showNotification('Actualisation...', 'success');
    await loadAllData();
}

// Utilitaires
function formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

function showNotification(message, type = 'success') {
    const notification = document.getElementById('notification');
    if (!notification) {
        console.log(`Notification (${type}): ${message}`);
        return;
    }
    
    notification.textContent = message;
    notification.className = `notification ${type}`;
    notification.classList.add('show');
    
    setTimeout(() => {
        notification.classList.remove('show');
    }, 3000);
}

// Raccourcis clavier
document.addEventListener('keydown', function(e) {
    if (e.code === 'Space' && !e.target.matches('input, textarea')) {
        e.preventDefault();
        togglePlayPause();
    } else if (e.code === 'ArrowLeft' && e.ctrlKey) {
        e.preventDefault();
        previousTrack();
    } else if (e.code === 'ArrowRight' && e.ctrlKey) {
        e.preventDefault();
        nextTrack();
    }
});

// Gestion du menu utilisateur
function showUserMenu() {
    const dropdown = document.getElementById('userDropdown');
    if (dropdown) {
        dropdown.classList.toggle('show');
    }
}

// Fermer le menu si on clique ailleurs
document.addEventListener('click', function(event) {
    const userMenu = document.querySelector('.user-menu');
    const dropdown = document.getElementById('userDropdown');
    
    if (userMenu && !userMenu.contains(event.target) && dropdown) {
        dropdown.classList.remove('show');
    }
});

// Déconnexion
async function logout() {
    try {
        const response = await fetch(`${API_BASE}?action=logout`, {
            method: 'POST'
        });
        
        const data = await response.json();
        
        if (data.success) {
            showNotification('Déconnexion réussie', 'success');
            setTimeout(() => {
                // Rediriger vers votre page de connexion existante
                alert('Vous avez été déconnecté. Veuillez vous reconnecter via votre système d\'authentification.');
                window.location.reload();
            }, 1000);
        }
    } catch (error) {
        console.error('Erreur lors de la déconnexion:', error);
        showNotification('Erreur lors de la déconnexion', 'error');
    }
}

// Variables pour la gestion des utilisateurs
let searchTimeout = null;
let currentViewedUser = null;

// Recherche d'utilisateurs avec délai
function searchUsers(query) {
    clearTimeout(searchTimeout);
    
    const userSearchResults = document.getElementById('userSearchResults');
    if (!userSearchResults) return;
    
    if (!query || query.trim().length < 2) {
        userSearchResults.innerHTML = `
            <div class="search-placeholder">
                <p>🔍 Tapez au moins 2 caractères pour commencer la recherche</p>
            </div>
        `;
        return;
    }
    
    searchTimeout = setTimeout(async () => {
        try {
            userSearchResults.innerHTML = '<div class="loading">Recherche en cours...</div>';
            
            const response = await fetch(`${API_BASE}?action=search_users&q=${encodeURIComponent(query.trim())}`);
            const users = await response.json();
            
            displayUserSearchResults(users);
        } catch (error) {
            console.error('Erreur recherche utilisateurs:', error);
            userSearchResults.innerHTML = `
                <div class="search-placeholder">
                    <p>❌ Erreur lors de la recherche</p>
                </div>
            `;
        }
    }, 500);
}

// Afficher les résultats de recherche d'utilisateurs
function displayUserSearchResults(users) {
    const container = document.getElementById('userSearchResults');
    if (!container) return;
    
    if (users.length === 0) {
        container.innerHTML = `
            <div class="search-placeholder">
                <p>😔 Aucun utilisateur trouvé</p>
            </div>
        `;
        return;
    }
    
    container.innerHTML = '';
    
    users.forEach(user => {
        const userCard = document.createElement('div');
        userCard.className = 'user-card';
        userCard.onclick = () => viewUserProfile(user.id);
        
        const avatar = user.avatar_url ? 
            `<img src="${user.avatar_url}" alt="Avatar" style="width: 100%; height: 100%; border-radius: 50%;">` : 
            '👤';
        
        const lastActive = user.last_active ? 
            new Date(user.last_active).toLocaleDateString('fr-FR') : 
            'Jamais connecté';
        
        userCard.innerHTML = `
            <div class="user-card-avatar">${avatar}</div>
            <div class="user-card-info">
                <div class="user-card-name">${user.username}</div>
                <div class="user-card-stats">
                    ${user.playlist_count || 0} playlists • ${user.favorite_count || 0} favoris • Actif: ${lastActive}
                </div>
            </div>
        `;
        
        container.appendChild(userCard);
    });
}

// Voir le profil d'un utilisateur
async function viewUserProfile(userId) {
    try {
        currentViewedUser = userId;
        
        // Charger les informations du profil
        const response = await fetch(`${API_BASE}?action=get_user_profile&user_id=${userId}`);
        const user = await response.json();
        
        if (!response.ok) {
            throw new Error(user.error || 'Erreur lors du chargement du profil');
        }
        
        displayUserProfile(user);
        
        // Charger les playlists par défaut
        showProfileTab('playlists');
        
    } catch (error) {
        console.error('Erreur chargement profil:', error);
        showNotification('Erreur lors du chargement du profil', 'error');
    }
}

// Afficher le profil utilisateur
function displayUserProfile(user) {
    const profileSection = document.getElementById('userProfileSection');
    if (!profileSection) return;
    
    // Mettre à jour les informations du profil
    const profileUsername = document.getElementById('profileUsername');
    const profilePlaylists = document.getElementById('profilePlaylists');
    const profileFavorites = document.getElementById('profileFavorites');
    const profileUploaded = document.getElementById('profileUploaded');
    const profileRegistration = document.getElementById('profileRegistration');
    
    if (profileUsername) profileUsername.textContent = user.username;
    if (profilePlaylists) profilePlaylists.textContent = `${user.stats.playlist_count || 0} playlists`;
    if (profileFavorites) profileFavorites.textContent = `${user.stats.favorite_count || 0} favoris`;
    if (profileUploaded) profileUploaded.textContent = `${user.stats.uploaded_count || 0} uploads`;
    
    if (profileRegistration && user.registration_date) {
        const registrationDate = new Date(user.registration_date).toLocaleDateString('fr-FR');
        profileRegistration.textContent = registrationDate;
    }
    
    // Avatar
    const avatarElement = document.getElementById('profileAvatar');
    if (avatarElement) {
        if (user.avatar_url) {
            avatarElement.innerHTML = `<img src="${user.avatar_url}" alt="Avatar" style="width: 100%; height: 100%; border-radius: 50%;">`;
        } else {
            avatarElement.innerHTML = '👤';
        }
    }
    
    // Afficher la section profil
    profileSection.style.display = 'block';
    profileSection.scrollIntoView({ behavior: 'smooth' });
}

// Gestion des onglets du profil
function showProfileTab(tabName) {
    // Désactiver tous les onglets
    document.querySelectorAll('.profile-tab').forEach(tab => {
        tab.classList.remove('active');
    });
    
    document.querySelectorAll('.profile-tab-content').forEach(content => {
        content.classList.remove('active');
    });
    
    // Activer l'onglet sélectionné
    const tabButton = document.querySelector(`[onclick="showProfileTab('${tabName}')"]`);
    if (tabButton) tabButton.classList.add('active');
    
    const tabContent = document.getElementById(`profile${tabName.charAt(0).toUpperCase() + tabName.slice(1)}Content`);
    if (tabContent) tabContent.classList.add('active');
    
    // Charger le contenu
    if (tabName === 'playlists') {
        loadUserPlaylists(currentViewedUser);
    } else if (tabName === 'favorites') {
        loadUserFavorites(currentViewedUser);
    }
}

// Charger les playlists d'un utilisateur
async function loadUserPlaylists(userId) {
    const userPlaylistsList = document.getElementById('userPlaylistsList');
    if (!userPlaylistsList) return;
    
    try {
        userPlaylistsList.innerHTML = '<div class="loading">Chargement des playlists...</div>';
        
        const response = await fetch(`${API_BASE}?action=get_user_playlists&user_id=${userId}`);
        const playlists = await response.json();
        
        if (!response.ok) {
            throw new Error(playlists.error || 'Erreur lors du chargement');
        }
        
        displayUserPlaylists(playlists);
        
    } catch (error) {
        console.error('Erreur chargement playlists:', error);
        userPlaylistsList.innerHTML = '<div class="loading">Erreur lors du chargement</div>';
    }
}

// Afficher les playlists d'un utilisateur
function displayUserPlaylists(playlists) {
    const container = document.getElementById('userPlaylistsList');
    if (!container) return;
    
    if (playlists.length === 0) {
        container.innerHTML = '<div class="loading">Cet utilisateur n\'a pas encore de playlists</div>';
        return;
    }
    
    container.innerHTML = '';
    
    playlists.forEach(playlist => {
        const playlistCard = document.createElement('div');
        playlistCard.className = 'user-playlist-card';
        
        playlistCard.innerHTML = `
            <div class="user-playlist-header">
                <div class="user-playlist-title">
                    <span>${playlist.icon || '🎵'}</span>
                    <span>${playlist.name}</span>
                </div>
                <div class="user-playlist-actions">
                    <button class="btn btn-primary" onclick="copyPlaylistToMine(${playlist.id}, '${playlist.name.replace(/'/g, "\\'")}')">
                        📋 Copier
                    </button>
                </div>
            </div>
            <div class="user-playlist-info">
                ${playlist.track_count || 0} musiques
                ${playlist.description ? `• ${playlist.description}` : ''}
            </div>
            ${playlist.sample_tracks ? `<div class="user-playlist-tracks">Exemples: ${playlist.sample_tracks}</div>` : ''}
        `;
        
        container.appendChild(playlistCard);
    });
}

// Charger les favoris d'un utilisateur
async function loadUserFavorites(userId) {
    const userFavoritesList = document.getElementById('userFavoritesList');
    if (!userFavoritesList) return;
    
    try {
        userFavoritesList.innerHTML = '<div class="loading">Chargement des favoris...</div>';
        
        const response = await fetch(`${API_BASE}?action=get_user_favorites&user_id=${userId}`);
        const favorites = await response.json();
        
        if (!response.ok) {
            throw new Error(favorites.error || 'Erreur lors du chargement');
        }
        
        displayUserFavorites(favorites);
        
    } catch (error) {
        console.error('Erreur chargement favoris:', error);
        userFavoritesList.innerHTML = '<div class="loading">Erreur lors du chargement</div>';
    }
}

// Afficher les favoris d'un utilisateur
function displayUserFavorites(favorites) {
    const container = document.getElementById('userFavoritesList');
    if (!container) return;
    
    if (favorites.length === 0) {
        container.innerHTML = '<div class="loading">Cet utilisateur n\'a pas encore de favoris</div>';
    }
    
    container.innerHTML = '';
    
    favorites.forEach(favorite => {
        const favoriteCard = document.createElement('div');
        favoriteCard.className = 'user-favorite-card';
        
        favoriteCard.innerHTML = `
            <div class="user-favorite-info">
                <div class="user-favorite-title">${favorite.cover_emoji || '🎵'} ${favorite.title}</div>
                <div class="user-favorite-details">
                    ${favorite.artist} • ${favorite.album || 'N/A'} • ${favorite.file_size_formatted || 'N/A'}
                </div>
            </div>
            <div class="user-favorite-actions">
                <button class="btn btn-primary" onclick="playMusic(${favorite.id})">▶</button>
                <button class="btn btn-secondary" onclick="addToMyFavorites(${favorite.id})">❤️</button>
            </div>
        `;
        
        container.appendChild(favoriteCard);
    });
}

// Copier une playlist vers mes playlists
async function copyPlaylistToMine(playlistId, playlistName) {
    const newName = prompt(`Nom pour votre copie de la playlist "${playlistName}":`, `${playlistName} (Copie)`);
    
    if (!newName) return;
    
    try {
        const formData = new FormData();
        formData.append('playlist_id', playlistId);
        formData.append('new_name', newName);
        
        const response = await fetch(`${API_BASE}?action=copy_to_my_playlist`, {
            method: 'POST',
            body: formData
        });
        
        const data = await response.json();
        
        if (response.ok) {
            showNotification(data.message, 'success');
            // Recharger mes playlists
            loadPlaylists();
        } else {
            throw new Error(data.error);
        }
    } catch (error) {
        console.error('Erreur copie playlist:', error);
        showNotification('Erreur lors de la copie de la playlist', 'error');
    }
}

// Ajouter une musique à mes favoris
async function addToMyFavorites(musicId) {
    try {
        const formData = new FormData();
        formData.append('music_id', musicId);
        
        const response = await fetch(`${API_BASE}?action=add_to_my_favorites`, {
            method: 'POST',
            body: formData
        });
        
        const data = await response.json();
        
        if (response.ok) {
            showNotification(data.message, 'success');
            // Recharger mes favoris
            loadFavorites();
        } else {
            throw new Error(data.error);
        }
    } catch (error) {
        console.error('Erreur ajout favoris:', error);
        showNotification(error.message || 'Erreur lors de l\'ajout aux favoris', 'error');
    }
}

// Fermer le profil utilisateur
function closeUserProfile() {
    const userProfileSection = document.getElementById('userProfileSection');
    if (userProfileSection) {
        userProfileSection.style.display = 'none';
    }
    currentViewedUser = null;
}

// Add missing functions that might be called from HTML
function addToPlaylistPrompt(musicId) {
    // Simple implementation - you can enhance this
    const playlistName = prompt('Nom de la playlist (laissez vide pour créer une nouvelle playlist):');
    if (playlistName !== null) {
        if (playlistName.trim() === '') {
            // Create new playlist
            createPlaylist();
        } else {
            // Add to existing playlist (you'll need to implement this)
            showNotification('Fonctionnalité à implémenter: ajouter à une playlist existante', 'info');
        }
    }
}

function showPlaylistTracks(playlistId) {
    // Implementation for showing playlist tracks
    showNotification('Fonctionnalité à implémenter: afficher les pistes de la playlist', 'info');
}

console.log('🎵 MusicStream Pro chargé !');
console.log('Raccourcis: ESPACE (play/pause), CTRL+← et CTRL+→ (navigation)');