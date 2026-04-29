// downloadIcons.js
// Script pour télécharger toutes les icônes des champions RSL

const https = require('https');
const http = require('http');
const fs = require('fs');
const path = require('path');
const { promisify } = require('util');
const stream = require('stream');
const pipeline = promisify(stream.pipeline);

// Import tes données de champions
const champions = require('./championData.js');

// Configuration
const OUTPUT_DIR = './champion_icons';
const DELAY_BETWEEN_REQUESTS = 1000; // 1 seconde entre chaque requête

// Créer le dossier de sortie
if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}

// Fonction pour attendre
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

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
            
            res.on('data', (chunk) => {
                data += chunk;
            });
            
            res.on('end', () => {
                resolve(data);
            });
        }).on('error', (err) => {
            reject(err);
        });
    });
}

// Fonction pour extraire l'URL de l'icône depuis le HTML
function extractIconURL(html, championName) {
    // STRICT : On ne prend QUE les URLs avec "Icone-de-", "Icone-du-", "Icone-" ou "logo-(nom)"
    const iconePatterns = [
        /https:\/\/www\.alucare\.fr\/wp-content\/uploads\/[^"']+Icone-de-[^"']+\.(?:jpg|png|jpeg|webp)/gi,
        /https:\/\/www\.alucare\.fr\/wp-content\/uploads\/[^"']+Icone-du-[^"']+\.(?:jpg|png|jpeg|webp)/gi,
        /https:\/\/www\.alucare\.fr\/wp-content\/uploads\/[^"']+Icone-[^"']+\.(?:jpg|png|jpeg|webp)/gi,
        /https:\/\/www\.alucare\.fr\/wp-content\/uploads\/[^"']+logo-[^"'\/]+\.(?:jpg|png|jpeg|webp)/gi // logo-(nom).jpg
    ];
    
    // Mots-clés à exclure (versions redimensionnées et logos génériques)
    const excludeKeywords = [
        'scaled', 
        'transformed',
        'cropped-' // Pour éviter le logo du site
    ];
    
    for (const pattern of iconePatterns) {
        const matches = html.matchAll(pattern);
        for (const match of matches) {
            const url = match[0];
            const urlLower = url.toLowerCase();
            // Éviter les versions scaled/transformed et le logo du site
            if (!excludeKeywords.some(keyword => urlLower.includes(keyword))) {
                return url;
            }
        }
    }
    
    // Si aucune icône trouvée avec ces patterns, retourner null pour générer une erreur
    return null;
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
                // Suivre la redirection
                downloadImage(res.headers.location, filepath).then(resolve).catch(reject);
                return;
            }
            
            if (res.statusCode !== 200) {
                reject(new Error(`Status code: ${res.statusCode}`));
                return;
            }
            
            const fileStream = fs.createWriteStream(filepath);
            pipeline(res, fileStream)
                .then(() => resolve())
                .catch(reject);
        }).on('error', (err) => {
            reject(err);
        });
    });
}

// Fonction pour nettoyer le nom de fichier
function sanitizeFilename(name) {
    return name
        .replace(/[<>:"/\\|?*]/g, '-')
        .replace(/\s+/g, ' ')
        .trim();
}

// Fonction principale
async function downloadAllIcons() {
    console.log(`🚀 Début du téléchargement de ${champions.length} icônes...\n`);
    
    let successCount = 0;
    let errorCount = 0;
    const errors = [];
    
    for (let i = 0; i < champions.length; i++) {
        const champion = champions[i];
        const progress = `[${i + 1}/${champions.length}]`;
        
        try {
            console.log(`${progress} Traitement de "${champion.name}"...`);
            
            // Télécharger la page HTML
            const html = await fetchHTML(champion.url);
            
            // Extraire l'URL de l'icône
            const iconURL = extractIconURL(html, champion.name);
            
            if (!iconURL) {
                throw new Error('Impossible de trouver l\'icône sur la page');
            }
            
            console.log(`  ↳ Icône trouvée: ${iconURL.substring(0, 60)}...`);
            
            // Nom du fichier de sortie (toujours en .jpg)
            const filename = `${sanitizeFilename(champion.name)}.jpg`;
            const filepath = path.join(OUTPUT_DIR, filename);
            
            // Télécharger l'image
            await downloadImage(iconURL, filepath);
            
            console.log(`  ✅ Téléchargé: ${filename}\n`);
            successCount++;
            
            // Attendre avant la prochaine requête
            if (i < champions.length - 1) {
                await sleep(DELAY_BETWEEN_REQUESTS);
            }
            
        } catch (error) {
            console.error(`  ❌ Erreur: ${error.message}\n`);
            errorCount++;
            errors.push({ name: champion.name, error: error.message });
        }
    }
    
    // Résumé
    console.log('\n' + '='.repeat(50));
    console.log('📊 RÉSUMÉ');
    console.log('='.repeat(50));
    console.log(`✅ Succès: ${successCount}`);
    console.log(`❌ Échecs: ${errorCount}`);
    console.log(`📁 Dossier: ${OUTPUT_DIR}`);
    
    if (errors.length > 0) {
        console.log('\n⚠️  Échecs détaillés:');
        errors.forEach(err => {
            console.log(`  - ${err.name}: ${err.error}`);
        });
    }
    
    // Créer un fichier JSON avec les erreurs
    if (errors.length > 0) {
        fs.writeFileSync(
            path.join(OUTPUT_DIR, 'errors.json'),
            JSON.stringify(errors, null, 2)
        );
        console.log(`\n📝 Détails des erreurs sauvegardés dans errors.json`);
    }
}

// Lancer le script
downloadAllIcons().catch(console.error);