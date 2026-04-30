const https = require('https');
const fs = require('fs');
const path = require('path');
const stream = require('stream');
const { promisify } = require('util');
const pipeline = promisify(stream.pipeline);

const OUTPUT_DIR = './champion_icons';
const DELAY = 1500;

const missing = [
    { name: "Dazdurk Garderunes", url: "https://www.alucare.fr/wiki/guide-raid-shadow-legend/guide-sur-dazdurk-garderunes-artefact-et-maitrise/" },
    { name: "Légionnaire Noble",   url: "https://www.alucare.fr/wiki/guide-raid-shadow-legend/guide-sur-legionnaire-noble-artefact-et-maitrise/" },
    { name: "Ours Brise-glace",    url: "https://www.alucare.fr/wiki/guide-raid-shadow-legend/guide-sur-ours-brise-glace-artefact-et-maitrise/" },
    { name: "Peaulivide",          url: "https://www.alucare.fr/wiki/guide-raid-shadow-legend/guide-sur-peaulivide-artefact-et-maitrise/" },
    { name: "Xena: Princesse Guerrière", url: "https://www.alucare.fr/wiki/guide-raid-shadow-legend/guide-sur-xena-princesse-guerriere-artefact-et-maitrise/" },
];

const sleep = ms => new Promise(r => setTimeout(r, ms));

function fetchHTML(url) {
    return new Promise((resolve, reject) => {
        https.get(url, { headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' } }, res => {
            if (res.statusCode === 301 || res.statusCode === 302) {
                return fetchHTML(res.headers.location).then(resolve).catch(reject);
            }
            let data = '';
            res.on('data', c => data += c);
            res.on('end', () => resolve(data));
        }).on('error', reject);
    });
}

function extractIconURL(html) {
    const patterns = [
        /https:\/\/www\.alucare\.fr\/wp-content\/uploads\/[^"'\s]+Icone-de-[^"'\s]+\.(?:jpg|png|jpeg|webp)/gi,
        /https:\/\/www\.alucare\.fr\/wp-content\/uploads\/[^"'\s]+Icone-du-[^"'\s]+\.(?:jpg|png|jpeg|webp)/gi,
        /https:\/\/www\.alucare\.fr\/wp-content\/uploads\/[^"'\s]+Icone-[^"'\s]+\.(?:jpg|png|jpeg|webp)/gi,
        /https:\/\/www\.alucare\.fr\/wp-content\/uploads\/[^"'\s]+logo-[^"'\s\/]+\.(?:jpg|png|jpeg|webp)/gi,
    ];
    const exclude = ['scaled', 'transformed', 'cropped-'];
    for (const pat of patterns) {
        for (const m of html.matchAll(pat)) {
            const u = m[0];
            if (!exclude.some(k => u.toLowerCase().includes(k))) return u;
        }
    }
    return null;
}

function downloadImage(url, filepath) {
    return new Promise((resolve, reject) => {
        https.get(url, { headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' } }, res => {
            if (res.statusCode === 301 || res.statusCode === 302) {
                return downloadImage(res.headers.location, filepath).then(resolve).catch(reject);
            }
            if (res.statusCode !== 200) return reject(new Error(`HTTP ${res.statusCode}`));
            const ws = fs.createWriteStream(filepath);
            pipeline(res, ws).then(resolve).catch(reject);
        }).on('error', reject);
    });
}

function sanitize(name) {
    return name.replace(/[<>:"/\\|?*]/g, '-').replace(/\s+/g, ' ').trim();
}

async function main() {
    console.log(`Téléchargement de ${missing.length} icônes manquantes...\n`);
    for (const champ of missing) {
        process.stdout.write(`${champ.name} ... `);
        try {
            const html = await fetchHTML(champ.url);
            const iconUrl = extractIconURL(html);
            if (!iconUrl) throw new Error('icône introuvable sur la page');
            const filepath = path.join(OUTPUT_DIR, `${sanitize(champ.name)}.jpg`);
            await downloadImage(iconUrl, filepath);
            console.log(`OK  (${iconUrl.split('/').pop()})`);
        } catch (e) {
            console.log(`ECHEC — ${e.message}`);
        }
        await sleep(DELAY);
    }
    console.log('\nTerminé.');
}

main().catch(console.error);
