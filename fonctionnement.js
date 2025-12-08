let currentFilters = {
    rarities: new Set(),
    ranks: new Set()
};
let searchQuery = '';

function normalizeText(text) {
    return text.toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/['']/g, "'");
}

function filterChampions() {
    return champions.filter(champ => {
        const matchesSearch = searchQuery === '' ||
            normalizeText(champ.name).includes(normalizeText(searchQuery));

        const matchesRarity = currentFilters.rarities.size === 0 ||
            currentFilters.rarities.has(champ.rarity);

        const matchesRank = currentFilters.ranks.size === 0 ||
            currentFilters.ranks.has(champ.rank);

        return matchesSearch && matchesRarity && matchesRank;
    });
}

function groupByRarityAndRank(champions) {
    const grouped = {};
    champions.forEach(champ => {
        if (!grouped[champ.rarity]) {
            grouped[champ.rarity] = {};
        }
        if (!grouped[champ.rarity][champ.rank]) {
            grouped[champ.rarity][champ.rank] = [];
        }
        grouped[champ.rarity][champ.rank].push(champ);
    });
    return grouped;
}

function getRankLabel(rank) {
    const labels = {
        'S': 'Rang S (God Tier)',
        'A': 'Rang A (Excellent)',
        'B': 'Rang B (Bon)',
        'C': 'Rang C (Mauvais)',
        'D': 'Rang D (Terriblement nul)'
    };
    return labels[rank] || rank;
}

function renderChampions() {
    const filtered = filterChampions();
    const grouped = groupByRarityAndRank(filtered);
    const container = document.getElementById('championsContainer');

    if (filtered.length === 0) {
        container.innerHTML = '<div class="no-results">⚠️ Aucun champion trouvé</div>';
        document.getElementById('filteredCount').textContent = '0';
        return;
    }

    document.getElementById('filteredCount').textContent = filtered.length;

    const rarityOrder = ['Mythique', 'Légendaire'];
    const rankOrder = ['S', 'A', 'B', 'C', 'D'];

    let html = '';

    rarityOrder.forEach(rarity => {
        if (!grouped[rarity]) return;

        html += `
            <div class="rarity-section">
                <div class="rarity-header ${rarity}">
                    <h2>${rarity === 'Mythique' ? '✨' : '👑'} ${rarity}</h2>
                </div>
        `;

        rankOrder.forEach(rank => {
            if (!grouped[rarity][rank]) return;

            const champs = grouped[rarity][rank];

            html += `
                <div class="rank-group">
                    <div class="rank-title rank-${rank}">
                        ${getRankLabel(rank)} (${champs.length})
                    </div>
                    <div class="champions-grid">
            `;

            champs.forEach(champ => {
                html += `
                    <div class="champion-card" data-rarity="${champ.rarity}" onclick="window.open('${champ.url}', '_blank')">
                        <div class="champion-name">${champ.name}</div>
                        <div class="champion-info">
                            <span class="champion-rarity rarity-${champ.rarity}">${champ.rarity}</span>
                            <span class="champion-rank rank-badge-${champ.rank}">${champ.rank}</span>
                        </div>
                    </div>
                `;
            });

            html += `
                    </div>
                </div>
            `;
        });

        html += `</div>`;
    });

    container.innerHTML = html;
}

function updateStats() {
    const mythicCount = champions.filter(c => c.rarity === 'Mythique').length;
    const legendaryCount = champions.filter(c => c.rarity === 'Légendaire').length;

    document.getElementById('totalChampions').textContent = champions.length;
    document.getElementById('mythicCount').textContent = mythicCount;
    document.getElementById('legendaryCount').textContent = legendaryCount;
}

// Event listeners
document.getElementById('searchInput').addEventListener('input', (e) => {
    searchQuery = e.target.value;
    renderChampions();
});

document.querySelectorAll('.filter-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
        const filter = e.target.dataset.filter;
        
        if (filter === 'all') {
            currentFilters.rarities.clear();
            currentFilters.ranks.clear();
            document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
            e.target.classList.add('active');
        } else {
            document.querySelector('[data-filter="all"]').classList.remove('active');
            
            if (filter === 'Mythique' || filter === 'Légendaire') {
                if (currentFilters.rarities.has(filter)) {
                    currentFilters.rarities.delete(filter);
                    e.target.classList.remove('active');
                } else {
                    currentFilters.rarities.add(filter);
                    e.target.classList.add('active');
                }
            } else {
                if (currentFilters.ranks.has(filter)) {
                    currentFilters.ranks.delete(filter);
                    e.target.classList.remove('active');
                } else {
                    currentFilters.ranks.add(filter);
                    e.target.classList.add('active');
                }
            }
            
            if (currentFilters.rarities.size === 0 && currentFilters.ranks.size === 0) {
                document.querySelector('[data-filter="all"]').classList.add('active');
            }
        }
        
        renderChampions();
    });
});

// Set "Tous" as active by default
document.querySelector('[data-filter="all"]').classList.add('active');

// Initial render
updateStats();
renderChampions();