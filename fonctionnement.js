let currentFilter = 'all';
let searchQuery = '';

function escapeAttr(text) {
    return text
        .replace(/&/g, '&amp;')
        .replace(/"/g, '&quot;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');
}

function toggleChampionForm(button) {
    const card = button.closest('.champion-card');
    const showingAlt = card.classList.toggle('showing-alt-form');
    button.textContent = showingAlt ? '🔄 Forme 1' : '🔄 Forme 2';
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

    const rarityOrder = ['Mythique', 'Légendaire', 'Épique'];
    let html = '';

    rarityOrder.forEach(rarity => {
        if (!grouped[rarity]) return;

        const champs = grouped[rarity];
        
        html += `
            <div class="rarity-section ${rarity.toLowerCase()}">
                <div class="rarity-header">
                    <h2>${rarity}</h2>
                    <span class="champion-count">${champs.length} champions</span>
                </div>
                <div class="champions-grid">
        `;

        champs.forEach(champ => {
            const imagePath = getChampionImagePath(champ.name);
            const hasAltForm = champ.skills && champ.skills.some(s => s.altForm);

            function skillTitle(type, skill) {
                let t = `${type ? type + ' - ' : ''}${skill.name || 'Compétence'}`;
                if (skill.cooldown) t += ` (CD: ${skill.cooldown} tours)`;
                if (skill.description) t += `\n\n${skill.description}`;
                return escapeAttr(t);
            }

            html += `
                <div class="champion-card" data-rarity="${champ.rarity}">
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
                        <span class="champion-rarity rarity-${champ.rarity}">${champ.rarity}</span>
                        <span class="champion-rank rank-badge-${champ.rank}">${champ.rank}</span>
                    </div>
                    <div class="champion-skills">
                        ${champ.skills && champ.skills.length > 0 ?
                            champ.skills.map(skill => `
                                <div class="skill-icon">
                                    ${skill.icon ? `<img class="skill-form-img" data-form="base" src="${skill.icon}" alt="${skill.name || 'Compétence'}" title="${skillTitle(skill.type, skill)}" onerror="this.style.display='none';">` : '<span>S</span>'}
                                    ${skill.altForm ? `<img class="skill-form-img" data-form="alt" src="${skill.altForm.icon}" alt="${skill.altForm.name || 'Compétence'}" title="${skillTitle(skill.type, skill.altForm)}" onerror="this.style.display='none';">` : ''}
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