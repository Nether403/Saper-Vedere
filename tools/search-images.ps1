$ErrorActionPreference = 'Stop'
$ua = @{ 'User-Agent' = 'SaperVedere/1.0 (research)' }

$queries = @(
  'Lady with an Ermine Leonardo',
  'Virgin of the Rocks National Gallery London Leonardo',
  'Saint Jerome in the Wilderness Leonardo',
  'Virgin and Child with Saint Anne Leonardo Louvre',
  'Portrait of a Musician Leonardo',
  'La Belle Ferronniere Leonardo',
  'Baptism of Christ Verrocchio Leonardo Uffizi',
  'Madonna Litta Leonardo',
  'Benois Madonna Leonardo',
  'Leonardo da Vinci foetus in the womb',
  'Leonardo da Vinci anatomical study shoulder arm',
  'Leonardo da Vinci deluge drawing',
  'Leonardo da Vinci Codex Leicester folio',
  'Leonardo da Vinci Codex Atlanticus folio',
  'Leonardo da Vinci study of horse Sforza',
  'Leonardo da Vinci cats dragon studies',
  'La Scapigliata Leonardo',
  'Leonardo da Vinci grotesque heads drawing',
  'Leonardo da Vinci Star of Bethlehem drawing',
  'Leonardo da Vinci skull study anatomy',
  'Leonardo da Vinci armoured car scythed chariot',
  'Leonardo da Vinci self propelled cart automobile',
  'Leonardo da Vinci ornithopter flying machine drawing',
  'Leonardo da Vinci central plan church study',
  'Leonardo da Vinci head of Leda study',
  'Leonardo da Vinci war machine crossbow giant',
  'Leonardo da Vinci study drapery',
  'Leonardo da Vinci Vitruvian man',
  'Leonardo da Vinci mirror writing notebook page',
  'Leonardo da Vinci landscape Arno 1473'
)

foreach ($q in $queries) {
  Write-Output "################ $q"
  $body = @{
    action = 'query'; format = 'json'; generator = 'search'
    gsrsearch = "$q"; gsrnamespace = '6'; gsrlimit = '8'
    prop = 'imageinfo'; iiprop = 'url|size'
  }
  try {
    $r = Invoke-RestMethod -Method Post -Uri 'https://commons.wikimedia.org/w/api.php' -Body $body -Headers $ua
  } catch { Write-Output "  ERROR"; continue }
  if (-not $r.query) { Write-Output "  (no results)"; continue }
  foreach ($p in $r.query.pages.PSObject.Properties) {
    $pg = $p.Value
    $ii = $pg.imageinfo
    if ($ii) {
      Write-Output ("  {0}  [{1}x{2}]" -f $pg.title, $ii[0].width, $ii[0].height)
    } else {
      Write-Output ("  {0}" -f $pg.title)
    }
  }
  Start-Sleep -Milliseconds 150
}
