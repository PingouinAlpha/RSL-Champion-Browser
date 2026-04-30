// manualDownload.js
// Outil pour télécharger manuellement les icônes manquantes

const https = require('https');
const http = require('http');
const fs = require('fs');
const path = require('path');
const readline = require('readline');

// Configuration
const OUTPUT_DIR = './champion_icons';
const ERRORS_FILE = './champion_icons/errors.json';
const TEMP_DIR = './temp_preview'; // Dossier temporaire pour prévisualiser

// Créer les dossiers
if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}
if (!fs.existsSync(TEMP_DIR)) {
    fs.mkdirSync(TEMP_DIR, { recursive: true });
}

// Interface readline
const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

// Fonction pour poser une question
function question(query) {
    return new Promise(resolve => rl.question(query, resolve));
}

// Fonction pour vider le dossier temporaire
function clearTempDir() {
    if (fs.existsSync(TEMP_DIR)) {
        const files = fs.readdirSync(TEMP_DIR);
        files.forEach(file => {
            fs.unlinkSync(path.join(TEMP_DIR, file));
        });
    }
}

// Fonction pour télécharger une page HTML
async function fetchHTML(url) {
    return new Promise((resolve, reject) => {
        const protocol = url.startsWith('https') ? https : http;
        
        protocol.get(url, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
            }
        }, (res) => {
            let data = '';
            res.on('data', (chunk) => { data += chunk; });
            res.on('end', () => { resolve(data); });
        }).on('error', (err) => {
            reject(err);
        });
    });
}

// Fonction pour extraire toutes les images
function extractAllImages(html) {
    const allImages = [];
    const pattern = /https:\/\/www\.alucare\.fr\/wp-content\/uploads\/[^"']+\.(?:jpg|png|jpeg|webp)/gi;
    const matches = html.matchAll(pattern);
    
    for (const match of matches) {
        const url = match[0];
        const urlLower = url.toLowerCase();
        
        // Filtrer les images évidemment inutiles
        if (urlLower.includes('cropped-') || 
            urlLower.includes('/raid-shado') ||
            urlLower.includes('ajout-maison')) {
            continue;
        }
        
        allImages.push(url);
    }
    
    // Retourner les images uniques
    return [...new Set(allImages)];
}

// Fonction pour télécharger une image
async function downloadImage(url, filepath) {
    return new Promise((resolve, reject) => {
        const protocol = url.startsWith('https') ? https : http;
        
        protocol.get(url, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
            }
        }, (res) => {
            if (res.statusCode === 302 || res.statusCode === 301) {
                downloadImage(res.headers.location, filepath).then(resolve).catch(reject);
                return;
            }
            
            if (res.statusCode !== 200) {
                reject(new Error(`Status code: ${res.statusCode}`));
                return;
            }
            
            const fileStream = fs.createWriteStream(filepath);
            res.pipe(fileStream);
            fileStream.on('finish', () => {
                fileStream.close();
                resolve();
            });
            fileStream.on('error', reject);
        }).on('error', reject);
    });
}

// Fonction pour télécharger toutes les images dans le dossier temp
async function downloadImagesToTemp(images) {
    console.log('📥 Téléchargement des images pour prévisualisation...');
    
    for (let i = 0; i < images.length; i++) {
        const url = images[i];
        const ext = url.match(/\.(jpg|png|jpeg|webp)(\?|$)/i)?.[1] || 'jpg';
        const filename = `${i + 1}.${ext}`;
        const filepath = path.join(TEMP_DIR, filename);
        
        try {
            await downloadImage(url, filepath);
            process.stdout.write(`\r📥 Téléchargé : ${i + 1}/${images.length}`);
        } catch (err) {
            console.error(`\n❌ Erreur pour l'image ${i + 1}: ${err.message}`);
        }
    }
    console.log('\n✅ Toutes les images sont dans le dossier temp_preview/\n');
}

// Fonction pour nettoyer le nom de fichier
function sanitizeFilename(name) {
    return name
        .replace(/[<>:"/\\|?*]/g, '-')
        .replace(/\s+/g, ' ')
        .trim();
}

// Fonction principale
async function manualDownload() {
    console.log('🔧 Outil de téléchargement manuel d\'icônes\n');
    
    // Charger les erreurs
    if (!fs.existsSync(ERRORS_FILE)) {
        console.error('❌ Fichier errors.json introuvable !');
        console.log(`📁 Attendu : ${ERRORS_FILE}`);
        rl.close();
        return;
    }
    
    const errors = JSON.parse(fs.readFileSync(ERRORS_FILE, 'utf8'));
    
    if (errors.length === 0) {
        console.log('✅ Aucune erreur à traiter !');
        rl.close();
        return;
    }
    
    console.log(`📋 ${errors.length} champions sans icône détectés\n`);
    
    const championsData = require('./championData.js');
    const championsMap = new Map(championsData.map(c => [c.name, c.url]));
    
    let downloadedCount = 0;
    let skippedCount = 0;
    
    for (let i = 0; i < errors.length; i++) {
        const error = errors[i];
        const championName = error.name;
        const championUrl = championsMap.get(championName);
        
        if (!championUrl) {
            console.log(`\n⚠️  [${i + 1}/${errors.length}] ${championName} - URL non trouvée, skip`);
            skippedCount++;
            continue;
        }

        const existingFile = path.join(OUTPUT_DIR, `${sanitizeFilename(championName)}.jpg`);
        if (fs.existsSync(existingFile)) {
            console.log(`\n✅ [${i + 1}/${errors.length}] ${championName} - Icône déjà présente, skip`);
            skippedCount++;
            continue;
        }

        console.log(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
        console.log(`🎮 [${i + 1}/${errors.length}] ${championName}`);
        console.log(`🔗 ${championUrl}`);
        
        try {
            // Vider le dossier temporaire
            clearTempDir();
            
            // Télécharger la page HTML
            console.log('📥 Chargement de la page...');
            const html = await fetchHTML(championUrl);
            
            // Extraire toutes les images
            const images = extractAllImages(html);
            
            if (images.length === 0) {
                console.log('❌ Aucune image trouvée sur cette page');
                skippedCount++;
                continue;
            }
            
            console.log(`\n📸 ${images.length} image(s) trouvée(s)\n`);
            
            // Télécharger toutes les images dans temp_preview/
            await downloadImagesToTemp(images);
            
            console.log(`📁 Ouvre le dossier temp_preview/ pour voir les images\n`);
            console.log(`Les images sont nommées : 1.jpg, 2.jpg, 3.jpg, etc.\n`);
            console.log(`  0. Skip (passer)`);
            console.log(`  q. Quit (quitter)\n`);
            
            // Demander à l'utilisateur
            const choice = await question('👉 Choisir une image (numéro) : ');
            
            if (choice.toLowerCase() === 'q') {
                console.log('\n👋 Arrêt du programme');
                clearTempDir();
                break;
            }
            
            if (choice === '0' || choice === '') {
                console.log('⏭️  Champion skippé');
                skippedCount++;
                continue;
            }
            
            const imageIndex = parseInt(choice) - 1;
            
            if (isNaN(imageIndex) || imageIndex < 0 || imageIndex >= images.length) {
                console.log('❌ Choix invalide, champion skippé');
                skippedCount++;
                continue;
            }
            
            const selectedImage = images[imageIndex];
            console.log(`\n✅ Image ${choice} sélectionnée`);
            
            // Copier l'image du temp vers le dossier final
            const tempFiles = fs.readdirSync(TEMP_DIR);
            const tempFile = tempFiles.find(f => f.startsWith(`${choice}.`));
            
            if (!tempFile) {
                console.log('❌ Erreur : fichier temporaire introuvable');
                skippedCount++;
                continue;
            }
            
            const tempFilePath = path.join(TEMP_DIR, tempFile);
            const finalFilename = `${sanitizeFilename(championName)}.jpg`;
            const finalFilepath = path.join(OUTPUT_DIR, finalFilename);
            
            console.log('📥 Copie de l\'image...');
            fs.copyFileSync(tempFilePath, finalFilepath);
            
            console.log(`✅ Téléchargé : ${finalFilename}`);
            downloadedCount++;
            
        } catch (err) {
            console.error(`❌ Erreur : ${err.message}`);
            skippedCount++;
        }
    }
    
    // Nettoyage final
    clearTempDir();
    
    // Résumé
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('\n📊 RÉSUMÉ');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`✅ Téléchargés : ${downloadedCount}`);
    console.log(`⏭️  Skippés : ${skippedCount}`);
    console.log(`📁 Dossier : ${OUTPUT_DIR}\n`);
    
    rl.close();
}

// Lancer le programme
manualDownload().catch(console.error);