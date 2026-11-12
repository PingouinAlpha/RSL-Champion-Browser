# Affiche une popup "C'est bon ?" pour le prochain champion en attente
# dans skill_icons_progress.json. Se ferme quand on clique OK.

$queuePath = Join-Path $PSScriptRoot "..\skill_icons_progress.json"
$queue = Get-Content $queuePath -Raw -Encoding UTF8 | ConvertFrom-Json

$next = $queue | Where-Object { $_.status -eq "pending" } | Select-Object -First 1

if ($null -eq $next) {
    $message = "Plus aucun champion en attente dans la file !"
    $title = "Terminé"
} else {
    $message = "Champion : $($next.name)`nRareté : $($next.rarity)`nFaction : $($next.faction)`n`nMets la/les capture(s) de ses competences dans le dossier sorts/, puis clique OK."
    $title = "Prochain : $($next.name)"
}

Add-Type -AssemblyName System.Windows.Forms
[System.Windows.Forms.MessageBox]::Show($message, $title, [System.Windows.Forms.MessageBoxButtons]::OK, [System.Windows.Forms.MessageBoxIcon]::Information) | Out-Null

Write-Output "CLICKED: $($next.name)"
