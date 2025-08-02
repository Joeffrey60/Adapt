// Configuration
const API_BASE = 'api.php';

// Variables globales (adaptées pour songs)
let songLibrary = [];
let playlists = [];
let favorites = [];
let currentTrack = null;
let isPlaying = false;
let audioPlayer = null;
let selectedFile = null;
let currentUser = null;
let userSession = null;

// Initialisation
document.addEventListener('DOMContentLoaded', function() {
    audioPlayer = document.getElementById('audioPlayer');
    
    if (!audioPlayer) {
        console.warn('Audio player element with ID "audioPlayer" not found in the DOM.');
    }
    
    setupAudioPlayer();
    setupUploadArea();
    setupSearch();
    checkAuthentication();
});

// Configuration du lecteur audio
function setupAudioPlayer() {
    if (!audioPlayer) {
        console.warn('Audio player element not found. Audio functionality will be disabled.');
        return;
    }

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
            userSession = data.user.session_id || data.session_id || null;
            updateUserInterface();
            await loadAllData();
        } else {
            showNotification('Veuillez vous connecter pour accéder à l\'application', 'error');
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
    
    const userInfoElement = document.getElementById('userInfo');
    const userNameElement = document.getElementById('userName');
    const userRoleElement = document.getElementById('userRole');
    
    if (userInfoElement) userInfoElement.textContent = `Bienvenue, ${currentUser.username}`;
    if (userNameElement) userNameElement.textContent = currentUser.username;
    if (userRoleElement) userRoleElement.textContent = currentUser.role;
    
    if (userRoleElement && currentUser.role === 'admin') {
        userRoleElement.classList.add('admin');
    }
    
    const adminTab = document.querySelector('[onclick="showSection(\'admin\')"]');
    if (adminTab && currentUser.role !== 'admin') {
        adminTab.style.display = 'none';
    }
    
    const userAvatarElement = document.getElementById('userAvatar');
    if (userAvatarElement && currentUser.avatar_url) {
        userAvatarElement.innerHTML = `<img src="${currentUser.avatar_url}" alt="Avatar" style="width: 100%; height: 100%; border-radius: 50%;">`;
    }
}

// Chargement de toutes les données
async function loadAllData() {
    try {
        await Promise.all([
            loadSongs(), // Changé de loadMusic à loadSongs
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

// Chargement des chansons depuis l'API (remplace loadMusic)
async function loadSongs() {
    try {
        const response = await fetch(`${API_BASE}?action=get_songs`); // Changé de get_music à get_songs
        const data = await response.json();
        
        if (response.ok) {
            songLibrary = data; // Changé de musicLibrary à songLibrary
            console.log('Chansons chargées:', songLibrary.length);
        } else {
            throw new Error(data.error || 'Erreur lors du chargement');
        }
    } catch (error) {
        console.error('Erreur loadSongs:', error);
        songLibrary = [];
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
        if (!error.message.includes('400')) {
            showNotification('Erreur lors du chargement des playlists', 'error');
        }
    }
}

// Chargement des favoris
async function loadFavorites() {
    try {
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
        if (!error.message.includes('session') && !error.message.includes('Authentification')) {
            showNotification('Erreur lors du chargement des favoris', 'error');
        }
    }
}

// Navigation entre sections
function showSection(sectionName) {
    document.querySelectorAll('.section').forEach(section => {
        section.classList.remove('active');
    });
    
    document.querySelectorAll('.nav-tab').forEach(tab => {
        tab.classList.remove('active');
    });
    
    const targetSection = document.getElementById(sectionName);
    if (targetSection) {
        targetSection.classList.add('active');
    }
    
    if (event && event.target) {
        event.target.classList.add('active');
    }

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
    
    // Nouveautés (3 dernières chansons)
    const nouveautes = songLibrary.slice(0, 3);
    nouveautesContainer.innerHTML = '';
    
    if (nouveautes.length === 0) {
        nouveautesContainer.innerHTML = '<div class="loading"><p>Aucune chanson disponible</p></div>';
    } else {
        nouveautes.forEach(song => {
            nouveautesContainer.appendChild(createSongCard(song));
        });
    }
    
    // Suggestions (chansons aléatoires)
    const suggestions = songLibrary.slice(3, 6);
    suggestionsContainer.innerHTML = '';
    
    if (suggestions.length === 0) {
        suggestionsContainer.innerHTML = '<div class="loading"><p>Aucune suggestion disponible</p></div>';
    } else {
        suggestions.forEach(song => {
            suggestionsContainer.appendChild(createSongCard(song));
        });
    }
}

// Création d'une carte chanson (remplace createMusicCard)
function createSongCard(song) {
    const card = document.createElement('div');
    card.className = 'music-card'; // Garde le même nom de classe CSS
    
    // Utiliser cover_path s'il existe, sinon un emoji par défaut
    const coverDisplay = song.cover_path ? 
        `<img src="${song.cover_path}" alt="Cover" style="width: 50px; height: 50px; border-radius: 5px;">` : 
        '<div style="font-size: 30px;">🎵</div>';
    
    // Formater la durée
    const duration = song.duration ? formatDuration(song.duration) : 'N/A';
    
    card.innerHTML = `
        <div class="music-info">
            <div class="music-cover">${coverDisplay}</div>
            <div class="music-details">
                <h3>${song.title}</h3>
                <p>${song.artist} • ${duration}</p>
            </div>
        </div>
        <div class="music-actions">
            <button class="btn btn-primary" onclick="playSong(${song.id})">▶ Lire</button>
            <button class="favorite-btn ${favorites.includes(song.id) ? 'active' : ''}" onclick="toggleFavorite(${song.id})">♡</button>
            <button class="btn btn-secondary" onclick="addToPlaylistPrompt(${song.id})">+ Playlist</button>
        </div>
    `;
    return card;
}

// Lecture d'une chanson (remplace playMusic)
async function playSong(songId) {
    const song = songLibrary.find(s => s.id == songId);
    if (!song) {
        showNotification('Chanson non trouvée', 'error');
        return;
    }

    if (!audioPlayer) {
        showNotification('Lecteur audio non disponible', 'error');
        return;
    }

    try {
        currentTrack = song;
        // Construire l'URL du fichier audio
        const audioUrl = song.file_path.startsWith('http') ? song.file_path : `${window.location.origin}/${song.file_path}`;
        audioPlayer.src = audioUrl;
        
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
        
        // Incrémenter le compteur de lectures
        incrementPlayCount(songId);
        
        updateNowPlaying();
        updatePlayButton();
        
        const currentCover = document.getElementById('currentCover');
        if (currentCover) {
            currentCover.style.transform = 'scale(1.1)';
            setTimeout(() => {
                currentCover.style.transform = 'scale(1)';
            }, 200);
        }
        
        showNotification(`Lecture: ${song.title}`, 'success');
        
    } catch (error) {
        console.error('Erreur lors de la lecture:', error);
        showNotification('Erreur lors de la lecture - Fichier audio introuvable', 'error');
        isPlaying = false;
        updatePlayButton();
    }
}

// Fonction pour incrémenter le compteur de lectures
async function incrementPlayCount(songId) {
    try {
        await fetch(`${API_BASE}?action=increment_plays&song_id=${songId}`, {
            method: 'POST'
        });
    } catch (error) {
        console.error('Erreur increment play count:', error);
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
        
        // Afficher la couverture ou un emoji par défaut
        if (currentCover) {
            if (currentTrack.cover_path) {
                currentCover.innerHTML = `<img src="${currentTrack.cover_path}" alt="Cover" style="width: 100%; height: 100%; border-radius: 5px;">`;
            } else {
                currentCover.textContent = '🎵';
            }
        }
        
        if (favoriteBtn) {
            favoriteBtn.textContent = favorites.includes(currentTrack.id) ? '♥' : '♡';
            favoriteBtn.className = favorites.includes(currentTrack.id) ? 'favorite-btn active' : 'favorite-btn';
        }
    }
}

// Fonction pour formater la durée (utilitaire)
function formatDuration(seconds) {
    if (!seconds) return 'N/A';
    
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
}

// Contrôles du lecteur
async function togglePlayPause() {
    if (!currentTrack) {
        showNotification('Sélectionnez d\'abord une chanson !', 'error');
        return;
    }
    
    if (!audioPlayer) {
        showNotification('Lecteur audio non disponible', 'error');
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
    if (currentTrack && songLibrary.length > 0) {
        const currentIndex = songLibrary.findIndex(s => s.id == currentTrack.id);
        const prevIndex = currentIndex > 0 ? currentIndex - 1 : songLibrary.length - 1;
        playSong(songLibrary[prevIndex].id);
    }
}

function nextTrack() {
    if (currentTrack && songLibrary.length > 0) {
        const currentIndex = songLibrary.findIndex(s => s.id == currentTrack.id);
        const nextIndex = currentIndex < songLibrary.length - 1 ? currentIndex + 1 : 0;
        playSong(songLibrary[nextIndex].id);
    }
}

// Gestion des favoris (adaptée pour songs)
async function toggleFavorite(songId) {
    try {
        const formData = new FormData();
        formData.append('song_id', songId); // Changé de music_id à song_id
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
                favorites.push(parseInt(songId));
                showNotification('Ajouté aux favoris', 'success');
            } else {
                favorites = favorites.filter(id => id != songId);
                showNotification('Retiré des favoris', 'success');
            }
            
            updateFavoriteButtons();
            if (currentTrack && currentTrack.id == songId) {
                updateNowPlaying();
            }
            
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
            const songId = parseInt(onclick.match(/\d+/)?.[0]);
            if (songId) {
                btn.textContent = favorites.includes(songId) ? '♥' : '♡';
                btn.className = favorites.includes(songId) ? 'favorite-btn active' : 'favorite-btn';
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
        const favoriteSongs = await response.json();
        
        container.innerHTML = '';
        if (favoriteSongs.length === 0) {
            container.innerHTML = '<div class="loading"><p>Aucun favori pour le moment</p></div>';
        } else {
            favoriteSongs.forEach(song => {
                container.appendChild(createSongCard(song));
            });
        }
    } catch (error) {
        console.error('Erreur updateFavoritesDisplay:', error);
        container.innerHTML = '<div class="loading"><p>Erreur lors du chargement</p></div>';
    }
}

// Recherche (adaptée pour songs)
function setupSearch() {
    const searchInput = document.getElementById('searchInput');
    if (!searchInput) return;
    
    let searchTimeout;
    
    searchInput.addEventListener('input', function() {
        const query = this.value.toLowerCase().trim();
        const container = document.getElementById('searchResults');
        if (!container) return;
        
        clearTimeout(searchTimeout);
        
        if (query.length === 0) {
            container.innerHTML = '<div class="loading"><p>Tapez pour rechercher...</p></div>';
            return;
        }
        
        if (query.length < 2) {
            return;
        }
        
        searchTimeout = setTimeout(async () => {
            try {
                const response = await fetch(`${API_BASE}?action=search_songs&q=${encodeURIComponent(query)}`); // Changé de search à search_songs
                const results = await response.json();
                
                container.innerHTML = '';
                
                if (results.length === 0) {
                    container.innerHTML = '<div class="loading"><p>Aucun résultat trouvé</p></div>';
                } else {
                    results.forEach(song => {
                        container.appendChild(createSongCard(song));
                    });
                }
            } catch (error) {
                console.error('Erreur recherche:', error);
                container.innerHTML = '<div class="loading"><p>Erreur lors de la recherche</p></div>';
            }
        }, 300);
    });
}

// Mise à jour des statistiques (adaptée pour songs)
function updateLibraryStats() {
    const totalTracksElement = document.getElementById('totalTracks');
    const totalSizeElement = document.getElementById('totalSize');
    const totalGenresElement = document.getElementById('totalGenres');
    
    const totalTracks = songLibrary.length;
    const uniqueArtists = [...new Set(songLibrary.map(song => song.artist).filter(Boolean))].length;
    const uniqueAlbums = [...new Set(songLibrary.map(song => song.album).filter(Boolean))].length;
    
    if (totalTracksElement) totalTracksElement.textContent = totalTracks;
    if (totalSizeElement) totalSizeElement.textContent = `${uniqueArtists} artistes`;
    if (totalGenresElement) totalGenresElement.textContent = `${uniqueAlbums} albums`;
}

// Reste des fonctions (playlists, upload, admin, etc.) - gardent la même logique
// mais avec les références mises à jour vers songs au lieu de music

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
                            ${playlist.track_count || 0} chanson(s) • ${playlist.description || 'Playlist personnalisée'}
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

// Chargement des données admin (adaptées pour songs)
async function loadAdminData() {
    await loadSongs();
    updateAdminSongList();
    updateLibraryStats();
}

// Mise à jour de la liste admin (adaptée pour songs)
function updateAdminSongList() {
    const container = document.getElementById('adminMusicList'); // Garde le même ID pour la compatibilité CSS
    if (!container) return;
    
    container.innerHTML = '';
    
    if (songLibrary.length === 0) {
        container.innerHTML = '<div class="loading"><p>Aucune chanson dans la bibliothèque</p></div>';
        return;
    }
    
    songLibrary.forEach(song => {
        const songElement = document.createElement('div');
        songElement.className = 'admin-music-card';
        
        // Afficher le statut de la chanson
        const statusBadge = song.status === 'approved' ? 
            '<span style="color: green;">✓ Approuvée</span>' :
            song.status === 'pending' ? 
            '<span style="color: orange;">⏳ En attente</span>' :
            '<span style="color: red;">✗ Rejetée</span>';
        
        songElement.innerHTML = `
            <div class="admin-music-info">
                <h4>${song.title}</h4>
                <p>${song.artist} • ${song.album || 'N/A'} • ${song.plays || 0} lectures • ${statusBadge}</p>
            </div>
            <div class="admin-actions">
                <button class="btn btn-primary" onclick="playSong(${song.id})" style="padding: 5px 10px;">▶</button>
                ${song.status === 'pending' ? `<button class="btn btn-success" onclick="approveSong(${song.id})" style="padding: 5px 10px;">✓</button>` : ''}
                <button class="btn btn-danger" onclick="deleteSong(${song.id})" style="padding: 5px 10px;">🗑️</button>
            </div>
        `;
        container.appendChild(songElement);
    });
}

// Fonction pour approuver une chanson
async function approveSong(songId) {
    if (!confirm('Approuver cette chanson ?')) return;
    
    try {
        const formData = new FormData();
        formData.append('song_id', songId);
        
        const response = await fetch(`${API_BASE}?action=approve_song`, {
            method: 'POST',
            body: formData
        });
        
        const data = await response.json();
        
        if (response.ok) {
            showNotification('Chanson approuvée', 'success');
            await loadAllData();
        } else {
            throw new Error(data.error);
        }
    } catch (error) {
        console.error('Erreur approbation chanson:', error);
        showNotification('Erreur lors de l\'approbation', 'error');
    }
}

// Suppression d'une chanson (remplace deleteMusic)
async function deleteSong(songId) {
    if (!confirm('Supprimer définitivement cette chanson ?')) return;
    
    try {
        const formData = new FormData();
        formData.append('id', songId);
        
        const response = await fetch(`${API_BASE}?action=delete_song`, {
            method: 'POST',
            body: formData
        });
        
        const data = await response.json();
        
        if (response.ok) {
            showNotification('Chanson supprimée', 'success');
            await loadAllData();
        } else {
            throw new Error(data.error);
        }
    } catch (error) {
        console.error('Erreur suppression chanson:', error);
        showNotification('Erreur lors de la suppression', 'error');
    }
}

// Utilitaires et fonctions communes (restent identiques)
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

// Fonctions manquantes pour la compatibilité
function addToPlaylistPrompt(songId) {
    const playlistName = prompt('Nom de la playlist (laissez vide pour créer une nouvelle playlist):');
    if (playlistName !== null) {
        if (playlistName.trim() === '') {
            createPlaylist();
        } else {
            showNotification('Fonctionnalité à implémenter: ajouter à une playlist existante', 'info');
        }
    }
}

function showPlaylistTracks(playlistId) {
    showNotification('Fonctionnalité à implémenter: afficher les pistes de la playlist', 'info');
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

// Configuration de la zone d'upload (adaptée pour songs)
function setupUploadArea() {
    const uploadArea = document.getElementById('uploadArea');
    const uploadForm = document.getElementById('uploadForm');
    
    if (!uploadArea || !uploadForm) return;
    
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
    
    uploadForm.addEventListener('submit', function(e) {
        e.preventDefault();
        uploadSong(); // Changé de uploadMusic à uploadSong
    });
}

function handleFileSelect(file) {
    if (!file) return;
    
    const allowedTypes = ['audio/mpeg', 'audio/wav', 'audio/ogg'];
    if (!allowedTypes.includes(file.type)) {
        showNotification('Format de fichier non supporté', 'error');
        return;
    }
    
    if (file.size > 10 * 1024 * 1024) {
        showNotification('Fichier trop volumineux (max 10MB)', 'error');
        return;
    }
    
    selectedFile = file;
    
    const fileInfo = document.getElementById('fileInfo');
    const fileName = document.getElementById('fileName');
    const fileDetails = document.getElementById('fileDetails');
    
    if (fileName) fileName.textContent = file.name;
    if (fileDetails) fileDetails.textContent = `Taille: ${formatFileSize(file.size)} • Type: ${file.type}`;
    if (fileInfo) fileInfo.style.display = 'block';
    
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

// Upload de chanson (remplace uploadMusic)
async function uploadSong() {
    if (!selectedFile) {
        showNotification('Sélectionnez d\'abord un fichier', 'error');
        return;
    }
    
    const musicTitle = document.getElementById('musicTitle');
    const musicArtist = document.getElementById('musicArtist');
    const musicAlbum = document.getElementById('musicAlbum');
    
    const title = musicTitle ? musicTitle.value.trim() : '';
    const artist = musicArtist ? musicArtist.value.trim() : '';
    const album = musicAlbum ? musicAlbum.value.trim() : '';
    
    if (!title || !artist) {
        showNotification('Titre et artiste sont requis', 'error');
        return;
    }
    
    const formData = new FormData();
    formData.append('song_file', selectedFile); // Changé de music_file à song_file
    formData.append('title', title);
    formData.append('artist', artist);
    formData.append('album', album || 'Single');
    
    const progressBar = document.getElementById('progressBar');
    const progressFill = document.getElementById('progressFill');
    if (progressBar) progressBar.style.display = 'block';
    
    try {
        const response = await fetch(`${API_BASE}?action=upload_song`, { // Changé de upload à upload_song
            method: 'POST',
            body: formData
        });
        
        const data = await response.json();
        
        if (response.ok) {
            showNotification('Chanson uploadée avec succès !', 'success');
            
            const uploadForm = document.getElementById('uploadForm');
            const fileInfo = document.getElementById('fileInfo');
            if (uploadForm) uploadForm.reset();
            if (fileInfo) fileInfo.style.display = 'none';
            selectedFile = null;
            
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

async function refreshLibrary() {
    showNotification('Actualisation...', 'success');
    await loadAllData();
}

// Fonctions de gestion utilisateur et autres fonctions communes restent identiques...

console.log('🎵 MusicStream Pro chargé ! (Version Songs)');
console.log('Raccourcis: ESPACE (play/pause), CTRL+← et CTRL+→ (navigation)');