$ErrorActionPreference = 'Stop'

$titles = @(
  # --- Paintings ---
  'Mona Lisa, by Leonardo da Vinci, from C2RMF retouched.jpg',
  'Leonardo da Vinci (1452-1519) - The Last Supper (1495-1498).jpg',
  'Da Vinci Vitruve Luc Viatour.jpg',
  'Lady with an Ermine - Leonardo da Vinci (Czartoryski Museum).jpg',
  'Leonardo Da Vinci - Vergine delle Rocce (Louvre).jpg',
  'Leonardo da Vinci - Virgin of the Rocks (National Gallery, London).jpg',
  'Leonardo da Vinci - Saint John the Baptist C2RMF retouched.jpg',
  'Leonardo da Vinci - Ginevra de'' Benci - Google Art Project.jpg',
  'Leonardo da Vinci - Annunciazione - Google Art Project.jpg',
  'Leonardo da Vinci - Adorazione dei Magi - Google Art Project.jpg',
  'Leonardo da Vinci, Saint Jerome, c. 1483.jpg',
  'The Virgin and Child with Saint Anne (Leonardo).jpg',
  'Leonardo da Vinci attributed - Portrait of Cecilia Gallerani.jpg',
  'Leonardo da Vinci - Portrait of a Musician - Google Art Project.jpg',
  'La belle ferronniere.jpg',
  'Verrocchio, Leonardo da Vinci - Baptism of Christ - Uffizi.jpg',
  'Leonardo da Vinci - Litta Madonna (Hermitage).jpg',
  'Leonardo da Vinci - Benois Madonna (Hermitage).jpg',
  # --- Drawings / folios ---
  'Leonardo da Vinci helicopter and lifting wing.jpg',
  'Design for a Flying Machine.jpg',
  'Leonardo da Vinci - Design for a Flying Machine, c. 1488.jpg',
  'Leonardo da Vinci - Scythed Chariot and Armored Car.jpg',
  'Leonardo da Vinci Studies of the Foetus in the Womb.jpg',
  'Leonardo da Vinci - Anatomical studies of the shoulder - WGA12820.jpg',
  'Leonardo da Vinci - RCIN 919097 recto, The heart compared to a seed.jpg',
  'Leonardo da Vinci - Deluge - WGA12801.jpg',
  'Studies of Water passing Obstacles and falling.jpg',
  'Leonardo da Vinci - Study of horse.jpg',
  'Leonardo da Vinci - Studies of cats and a dragon.jpg',
  'Leonardo da Vinci - Head of a Woman (La Scapigliata).jpg',
  'Study of a Tuscan Landscape.jpg',
  'Leonardo self.jpg',
  'Codex Leicester.jpg',
  'Leonardo da Vinci - Codex Leicester f.4r.jpg',
  'Codex atlanticus.jpg',
  'Leonardo da Vinci - Study of a central church.jpg',
  'Leonardo da Vinci - Grotesque heads.jpg',
  'Leonardo da Vinci - Star of Bethlehem and other plants.jpg',
  'Leonardo da Vinci - Study for the Head of Leda.jpg',
  'Leonardo da Vinci - Study of the Head of Saint Anne.jpg',
  'Skull sectioned Leonardo.jpg'
)

$body = @{
  action = 'query'
  format = 'json'
  prop   = 'imageinfo'
  iiprop = 'url|size|extmetadata'
  iiurlwidth = '1400'
  titles = ($titles | ForEach-Object { "File:$_" }) -join '|'
}

$resp = Invoke-RestMethod -Method Post -Uri 'https://commons.wikimedia.org/w/api.php' -Body $body -Headers @{ 'User-Agent' = 'SaperVedere/1.0 (research)' }

$norm = @{}
if ($resp.query.normalized) { foreach ($n in $resp.query.normalized) { $norm[$n.to] = $n.from } }

$found = @()
$missing = @()
foreach ($p in $resp.query.pages.PSObject.Properties) {
  $page = $p.Value
  if ($page.missing -ne $null -or $page.imageinfo -eq $null) {
    $missing += $page.title
  } else {
    $ii = $page.imageinfo[0]
    $found += [pscustomobject]@{
      Title = $page.title
      W = $ii.width
      H = $ii.height
    }
  }
}

Write-Output "=== FOUND ($($found.Count)) ==="
$found | Sort-Object Title | ForEach-Object { Write-Output ("{0}  [{1}x{2}]" -f $_.Title, $_.W, $_.H) }
Write-Output ""
Write-Output "=== MISSING ($($missing.Count)) ==="
$missing | Sort-Object | ForEach-Object { Write-Output $_ }
