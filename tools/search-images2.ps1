$ErrorActionPreference = 'Stop'
$ua = @{ 'User-Agent' = 'SaperVedere/1.0 (research contact: local)' }

$queries = @(
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
  'Leonardo da Vinci self propelled cart',
  'Leonardo da Vinci ornithopter flying machine drawing',
  'Leonardo da Vinci central plan church study',
  'Leonardo da Vinci head of Leda study',
  'Leonardo da Vinci giant crossbow',
  'Leonardo da Vinci drapery study',
  'Leonardo da Vinci mirror writing notebook page',
  'Leonardo da Vinci landscape Arno 1473',
  'Leonardo da Vinci study of hands',
  'Leonardo da Vinci proportions of the head',
  'Leonardo da Vinci parachute design'
)

function Invoke-CommonsSearch($q) {
  $body = @{
    action = 'query'; format = 'json'; generator = 'search'
    gsrsearch = "$q"; gsrnamespace = '6'; gsrlimit = '8'
    prop = 'imageinfo'; iiprop = 'url|size'
  }
  for ($i = 0; $i -lt 4; $i++) {
    try {
      return Invoke-RestMethod -Method Post -Uri 'https://commons.wikimedia.org/w/api.php' -Body $body -Headers $ua
    } catch {
      Start-Sleep -Seconds (3 * ($i + 1))
    }
  }
  return $null
}

foreach ($q in $queries) {
  Write-Output "################ $q"
  $r = Invoke-CommonsSearch $q
  if ($null -eq $r) { Write-Output "  FAILED"; continue }
  if (-not $r.query) { Write-Output "  (no results)"; Start-Sleep -Seconds 2; continue }
  foreach ($p in $r.query.pages.PSObject.Properties) {
    $pg = $p.Value
    $ii = $pg.imageinfo
    if ($ii) { Write-Output ("  {0}  [{1}x{2}]" -f $pg.title, $ii[0].width, $ii[0].height) }
    else { Write-Output ("  {0}" -f $pg.title) }
  }
  Start-Sleep -Seconds 2
}
