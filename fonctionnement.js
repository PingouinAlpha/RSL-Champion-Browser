let currentFilter = 'all';
let searchQuery = '';

function toggleChampionForm(button) {
    const card = button.closest('.champion-card');
    const showingAlt = card.classList.toggle('showing-alt-form');
    button.textContent = showingAlt ? '🔄 Forme 1' : '🔄 Forme 2';
}

function encodeTooltip(html) {
    return btoa(unescape(encodeURIComponent(html)));
}

function decodeTooltip(encoded) {
    return decodeURIComponent(escape(atob(encoded)));
}

function typeSlug(type) {
    if (!type) return 'default';
    if (/^A\d/.test(type)) return 'active';
    if (/passif/i.test(type)) return 'passive';
    if (/aura/i.test(type)) return 'aura';
    return 'default';
}

function injectEffectIcons(html) {
    if (!html || typeof effectIcons === 'undefined') return html || '';
    return html.replace(/<span class="(fx-buff|fx-debuff)">\[([^\]]+)\]<\/span>/g, (match, cls, name) => {
        const icon = effectIcons[name.trim()];
        if (!icon) return match;
        return `<img class="fx-icon" src="${icon}" alt="${name}" onerror="this.style.display='none';">${match}`;
    });
}

function buildTooltipHtml(type, skill) {
    const slug = typeSlug(type);
    const upgradesHtml = skill.upgrades && skill.upgrades.length
        ? `<div class="skill-tt-upgrades"><span class="skill-tt-upgrades-label">Montée en niveau</span><ul>${skill.upgrades.map(u => `<li>${u}</li>`).join('')}</ul></div>`
        : '';
    const damageHtml = skill.damageBase
        ? `<div class="skill-tt-damage">Dégâts basés sur : <strong>${skill.damageBase}</strong></div>`
        : '';
    return `
        <div class="skill-tt-header">
            <span class="skill-tt-type type-${slug}">${type || 'Sort'}</span>
            <span class="skill-tt-name">${skill.name || 'Compétence'}</span>
            ${skill.cooldown ? `<span class="skill-tt-cd">⏱ ${skill.cooldown} tours</span>` : ''}
        </div>
        <div class="skill-tt-desc">${injectEffectIcons(skill.description)}</div>
        ${upgradesHtml}
        ${damageHtml}
    `;
}

function initSkillTooltip() {
    const tooltip = document.getElementById('skillTooltip');
    if (!tooltip) return;

    document.addEventListener('mouseover', (e) => {
        const img = e.target.closest('.skill-form-img');
        if (!img || !img.dataset.tooltip) return;
        tooltip.innerHTML = decodeTooltip(img.dataset.tooltip);
        tooltip.classList.add('visible');
        positionTooltip(tooltip, img);
    });

    document.addEventListener('mouseout', (e) => {
        if (e.target.closest('.skill-form-img')) {
            tooltip.classList.remove('visible');
        }
    });

    window.addEventListener('scroll', () => tooltip.classList.remove('visible'), true);
}

function positionTooltip(tooltip, anchor) {
    const rect = anchor.getBoundingClientRect();
    const tw = tooltip.offsetWidth || 360;
    const th = tooltip.offsetHeight || 180;
    let left = rect.left + rect.width / 2 - tw / 2;
    left = Math.max(12, Math.min(left, window.innerWidth - tw - 12));
    let top = rect.top - th - 10;
    if (top < 8) top = rect.bottom + 10;
    tooltip.style.left = `${left}px`;
    tooltip.style.top = `${top}px`;
}

function rarityClass(rarity) {
    return (rarity || '').replace(/\s+/g, '');
}

function normalizeText(text) {
    return text.toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/['']/g, "'");
}

function sanitizeFilename(name) {
    return name
        .replace(/[<>:"/\\|?*]/g, '-')
        .replace(/\s+/g, ' ')
        .trim();
}

function getChampionImagePath(championName) {
    // Nettoyer le nom du champion pour correspondre au nom de fichier
    const cleanName = sanitizeFilename(championName);
    
    // Essayer différentes extensions
    const extensions = ['jpg', 'png', 'jpeg', 'webp'];
    
    // Retourner le chemin avec l'extension par défaut (jpg est la plus courante sur Alucare)
    // On utilise jpg par défaut car c'est le format principal d'Alucare
    return `champion_icons/${cleanName}.jpg`;
}

function filterChampions() {
    return champions.filter(champ => {
        const matchesSearch = searchQuery === '' ||
            normalizeText(champ.name).includes(normalizeText(searchQuery));

        const matchesRarity = currentFilter === 'all' || champ.rarity === currentFilter;

        return matchesSearch && matchesRarity;
    });
}

function groupByRarity(champions) {
    const grouped = {};
    champions.forEach(champ => {
        if (!grouped[champ.rarity]) {
            grouped[champ.rarity] = [];
        }
        grouped[champ.rarity].push(champ);
    });
    
    // Trier par rang dans chaque rareté
    Object.keys(grouped).forEach(rarity => {
        grouped[rarity].sort((a, b) => {
            const rankOrder = { 'S': 0, 'A': 1, 'B': 2, 'C': 3, 'D': 4 };
            return rankOrder[a.rank] - rankOrder[b.rank];
        });
    });
    
    return grouped;
}

function updateSearchCount(count) {
    const countElement = document.getElementById('navSearchCount');
    if (count === 0) {
        countElement.textContent = 'Aucun résultat';
        countElement.style.color = '#ff4757';
    } else if (count === 1) {
        countElement.textContent = '1 résultat';
        countElement.style.color = '#26de81';
    } else {
        countElement.textContent = `${count} résultats`;
        countElement.style.color = '#26de81';
    }
}

function renderChampions() {
    const filtered = filterChampions();
    const grouped = groupByRarity(filtered);
    const container = document.getElementById('championsContainer');

    // Update search count in navbar
    updateSearchCount(filtered.length);

    if (filtered.length === 0) {
        container.innerHTML = '<div class="no-results">Aucun champion trouvé</div>';
        return;
    }

    const rarityOrder = ['Mythique', 'Légendaire', 'Épique', 'Rare', 'Peu Commun', 'Commun'];
    let html = '';

    rarityOrder.forEach(rarity => {
        if (!grouped[rarity]) return;

        const champs = grouped[rarity];
        
        html += `
            <div class="rarity-section ${rarityClass(rarity).toLowerCase()}">
                <div class="rarity-header">
                    <h2>${rarity}</h2>
                    <span class="champion-count">${champs.length} champions</span>
                </div>
                <div class="champions-grid">
        `;

        champs.forEach(champ => {
            const imagePath = getChampionImagePath(champ.name);
            const hasAltForm = champ.skills && champ.skills.some(s => s.altForm);

            html += `
                <div class="champion-card" data-rarity="${champ.rarity}" data-name="${champ.name.replace(/"/g, '&quot;')}">
                    <div class="champion-icon">
                        <img src="${imagePath}"
                             alt="${champ.name}"
                             onerror="this.style.display='none'; this.parentElement.innerHTML='<div class=\\'icon-placeholder\\'>?</div>';">
                    </div>
                    <div class="champion-header">
                        <div class="champion-name">${champ.name}</div>
                        <div class="champion-faction">${champ.faction || 'Faction inconnue'}</div>
                    </div>
                    <div class="champion-info">
                        <span class="champion-rarity rarity-${rarityClass(champ.rarity)}">${champ.rarity}</span>
                        ${champ.rank ? `<span class="champion-rank rank-badge-${champ.rank}">${champ.rank}</span>` : ''}
                    </div>
                    <div class="champion-skills">
                        ${champ.skills && champ.skills.length > 0 ?
                            champ.skills.map(skill => `
                                <div class="skill-icon${skill.altForm ? ' has-alt' : ''}">
                                    ${skill.icon ? `<img class="skill-form-img" data-form="base" src="${skill.icon}" alt="${skill.name || 'Compétence'}" data-tooltip="${encodeTooltip(buildTooltipHtml(skill.type, skill))}" onerror="this.style.display='none';">` : '<span>S</span>'}
                                    ${skill.altForm ? `<img class="skill-form-img" data-form="alt" src="${skill.altForm.icon}" alt="${skill.altForm.name || 'Compétence'}" data-tooltip="${encodeTooltip(buildTooltipHtml(skill.type, skill.altForm))}" onerror="this.style.display='none';">` : ''}
                                </div>
                            `).join('')
                            : '<div class="skills-coming">Compétences à venir</div>'
                        }
                    </div>
                    <div class="champion-actions">
                        ${hasAltForm ? `<button class="btn-toggle-form" onclick="toggleChampionForm(this)">🔄 Forme 2</button>` : ''}
                        <button class="btn-details" onclick="window.open('${champ.url}', '_blank')">
                            Voir le guide
                        </button>
                    </div>
                </div>
            `;
        });

        html += `
                </div>
            </div>
        `;
    });

    container.innerHTML = html;
}

function updateStats() {
    const mythicCount = champions.filter(c => c.rarity === 'Mythique').length;
    const legendaryCount = champions.filter(c => c.rarity === 'Légendaire').length;
    const epicCount = champions.filter(c => c.rarity === 'Épique').length;

    document.getElementById('totalChampions').textContent = champions.length;
    document.getElementById('mythicCount').textContent = mythicCount;
    document.getElementById('legendaryCount').textContent = legendaryCount;
    const epicEl = document.getElementById('epicCount');
    if (epicEl) epicEl.textContent = epicCount;
}

// ============================================
// CHAMPION DETAIL VIEW (presentation page)
// ============================================

const FACTION_COLORS = {
    'Banner Lords': '#d4af37',
    'High Elves': '#7fd8e8',
    'Sacred Order': '#f4e285',
    'Ogryn Tribes': '#c97b3d',
    'Lizardmen': '#4caf50',
    'Skinwalkers': '#8b4513',
    'Orcs': '#6b8e23',
    'Demonspawn': '#b71c1c',
    'Undead Hordes': '#6a5acd',
    'Dark Elves': '#4a148c',
    'Knights Revenant': '#455a64',
    'Barbarians': '#a1887f',
    'Dwarves': '#607d8b',
    'Shadowkin': '#263238',
    'Sylvan Watchers': '#2e7d32',
};

const RARITY_COLORS = {
    'Mythique': 'linear-gradient(135deg, #dc143c 0%, #ff4757 100%)',
    'Légendaire': 'linear-gradient(135deg, #ffa500 0%, #ffd700 100%)',
    'Épique': 'linear-gradient(135deg, #a855f7 0%, #d946ef 100%)',
    'Rare': 'linear-gradient(135deg, #3b82f6 0%, #60a5fa 100%)',
    'Peu Commun': 'linear-gradient(135deg, #22c55e 0%, #4ade80 100%)',
    'Commun': 'linear-gradient(135deg, #94a3b8 0%, #cbd5e1 100%)',
};

function findChampionByName(name) {
    return champions.find(c => c.name === name);
}

function renderDetailSkill(skill) {
    const slug = typeSlug(skill.type);
    const upgradesHtml = skill.upgrades && skill.upgrades.length
        ? `<ul class="detail-skill-upgrades">${skill.upgrades.map(u => `<li>${u}</li>`).join('')}</ul>`
        : '';
    return `
        <div class="detail-skill">
            <div class="detail-skill-icon">
                ${skill.icon ? `<img src="${skill.icon}" alt="${skill.name || ''}" onerror="this.style.display='none';">` : '<span>?</span>'}
            </div>
            <div class="detail-skill-body">
                <div class="detail-skill-head">
                    <span class="detail-skill-type type-${slug}">${skill.type || 'Sort'}</span>
                    <span class="detail-skill-name">${skill.name || 'Compétence'}</span>
                    ${skill.cooldown ? `<span class="detail-skill-cd">⏱ ${skill.cooldown} tours</span>` : ''}
                </div>
                <div class="detail-skill-desc">${injectEffectIcons(skill.description)}</div>
                ${upgradesHtml}
            </div>
        </div>
    `;
}

function openChampionDetail(name) {
    const champ = findChampionByName(name);
    if (!champ) return;
    const overlay = document.getElementById('championDetailOverlay');
    const imagePath = getChampionImagePath(champ.name);
    const factionColor = FACTION_COLORS[champ.faction] || '#888';
    const rarityGradient = RARITY_COLORS[champ.rarity] || 'linear-gradient(135deg, #888 0%, #aaa 100%)';

    const skillsHtml = champ.skills && champ.skills.length
        ? champ.skills.map(renderDetailSkill).join('')
        : '<div class="skills-coming">Compétences à venir</div>';

    overlay.innerHTML = `
        <div class="detail-backdrop" style="background: radial-gradient(circle at 50% 0%, ${factionColor}33 0%, transparent 60%), var(--bg-dark);"></div>
        <div class="detail-panel">
            <button class="detail-close" onclick="closeChampionDetail()">&times;</button>
            <div class="detail-hero" style="background: linear-gradient(180deg, ${factionColor}55 0%, transparent 100%);">
                <div class="detail-portrait-frame" style="border-image: ${rarityGradient} 1;">
                    <img src="${imagePath}" alt="${champ.name}" class="detail-portrait" onerror="this.style.display='none';">
                </div>
                <div class="detail-identity">
                    <h2 class="detail-name">${champ.name}</h2>
                    <div class="detail-badges">
                        <span class="champion-rarity rarity-${rarityClass(champ.rarity)}">${champ.rarity || ''}</span>
                        ${champ.rank ? `<span class="champion-rank rank-badge-${champ.rank}">Rang ${champ.rank}</span>` : ''}
                    </div>
                    <div class="detail-faction" style="color: ${factionColor};">${champ.faction || 'Faction inconnue'}</div>
                    ${champ.url ? `<a class="btn-details detail-guide-link" href="${champ.url}" target="_blank">Voir le guide complet</a>` : ''}
                </div>
            </div>
            <div class="detail-skills-section">
                <h3 class="detail-section-title">Compétences</h3>
                <div class="detail-skills-list">${skillsHtml}</div>
            </div>
        </div>
    `;
    overlay.classList.add('visible');
    document.body.style.overflow = 'hidden';
}

function closeChampionDetail() {
    const overlay = document.getElementById('championDetailOverlay');
    overlay.classList.remove('visible');
    document.body.style.overflow = '';
}

document.getElementById('championsContainer').addEventListener('click', (e) => {
    if (e.target.closest('.champion-actions')) return;
    const card = e.target.closest('.champion-card');
    if (!card) return;
    openChampionDetail(card.dataset.name);
});

document.getElementById('championDetailOverlay').addEventListener('click', (e) => {
    if (e.target.id === 'championDetailOverlay' || e.target.classList.contains('detail-backdrop')) {
        closeChampionDetail();
    }
});

document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closeChampionDetail();
});

// Event listeners
document.getElementById('searchInput').addEventListener('input', (e) => {
    searchQuery = e.target.value;
    renderChampions();
});

document.getElementById('rarityFilter').addEventListener('change', (e) => {
    currentFilter = e.target.value;
    renderChampions();
});

// Navigation smooth scroll
document.querySelectorAll('.nav-link:not(.external)').forEach(link => {
    link.addEventListener('click', (e) => {
        e.preventDefault();
        const section = e.target.dataset.section;
        
        // Update active nav link
        document.querySelectorAll('.nav-link').forEach(l => l.classList.remove('active'));
        e.target.classList.add('active');
        
        // Smooth scroll to section
        if (section === 'champions') {
            document.getElementById('champions').scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
    });
});

// Initial render
updateStats();
renderChampions();
initSkillTooltip();