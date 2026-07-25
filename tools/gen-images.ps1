$ErrorActionPreference = 'Stop'
$ua = @{ 'User-Agent' = 'SaperVedere/1.0 (research)' }

# key => Commons file name (without the "File:" prefix)
$map = [ordered]@{
  monalisa      = 'Mona Lisa, by Leonardo da Vinci, from C2RMF retouched.jpg'
  cenacolo      = 'Leonardo da Vinci (1452-1519) - The Last Supper (1495-1498).jpg'
  ermine        = 'Lady with an Ermine - Leonardo da Vinci (adjusted levels).jpg'
  rocceLouvre   = 'Leonardo Da Vinci - Vergine delle Rocce (Louvre).jpg'
  rocceLondon   = 'Leonardo da Vinci - Vergine delle Rocce (National Gallery London).jpg'
  battista      = 'Leonardo da Vinci - Saint John the Baptist C2RMF retouched.jpg'
  ginevra       = 'Leonardo da Vinci - Ginevra de'' Benci - Google Art Project.jpg'
  annunciazione = 'Leonardo da Vinci - Annunciazione - Google Art Project.jpg'
  magi          = 'Leonardo da Vinci - Adorazione dei Magi - Google Art Project.jpg'
  girolamo      = 'Leonardo da Vinci - Saint Jerome.jpg'
  santanna      = 'Leonardo da Vinci - Virgin and Child with St Anne C2RMF retouched.jpg'
  musico        = 'Leonardo da Vinci - Portrait of a Musician - Pinacoteca Ambrosiana.jpg'
  battesimo     = 'The Baptism of Christ (Verrocchio and Leonardo).jpg'
  benois        = 'Leonardo Da Vinci - Madonna Benois.jpg'
  scapigliata   = 'Leonardo da vinci - La scapigliata.jpg'

  vitruvio      = 'Da Vinci Vitruve Luc Viatour.jpg'
  vite          = 'Leonardo da Vinci helicopter and lifting wing.jpg'
  ornitottero   = 'Design for a Flying Machine.jpg'
  carro         = 'LeonardoCardDrawing.jpg'
  feto          = 'Leonardo da Vinci - Studies of the foetus in the womb.jpg'
  diluvio       = 'Leonardo da Vinci - A deluge - Google Art Project.jpg'
  acqua         = 'Studies of Water passing Obstacles and falling.jpg'
  gatti         = 'Leonardo da Vinci - RCIN 912363, Cats, lions, and a dragon c.1517-18.jpg'
  stella        = 'Leonardo da Vinci - A star-of-Bethlehem and other plants, c.1506-12.jpg'
  carroArmato   = 'Leonardo da Vinci - 1860,0616.99, Studies of military tank-like machines.jpg'
  balestra      = 'Leonardo da Vinci''s Giant Crossbow - design.jpg'
  tempio        = 'Leonardo da vinci, Study of a central church.jpg'
  sforza        = 'Leonardo da Vinci - Manuscript page on the Sforza monument - WGA12879.jpg'
  proporzioni   = 'Leonardo da Vinci - RCIN 912606, A head of a man in profile, with proportions indicated c.1490.jpg'
  arno          = 'Study of a Tuscan Landscape.jpg'
  panneggio     = 'Leonardo da Vinci - Study of Drapery, c1475-1482 -Fondation Custodia 6632.jpg'
  grottesca     = 'Leonardo da vinci, Grotesque head.jpg'
  autoritratto  = 'Leonardo self.jpg'
  testa         = 'Leonardo da Vinci - RCIN 912601, The proportions of the head, and a standing nude c.1490.jpg'
}

# Only these widths may be hotlinked from upload.wikimedia.org.
# https://www.mediawiki.org/wiki/Common_thumbnail_sizes
$STEPS = @(250, 500, 960, 1280, 1920)

$titles = $map.Values | ForEach-Object { "File:$_" }
$body = @{
  action = 'query'; format = 'json'; prop = 'imageinfo'
  iiprop = 'url|size|extmetadata'
  titles = ($titles -join '|')
}
$r = Invoke-RestMethod -Method Post -Uri 'https://commons.wikimedia.org/w/api.php' -Body $body -Headers $ua

# index API results by normalised title
$byTitle = @{}
foreach ($p in $r.query.pages.PSObject.Properties) {
  $pg = $p.Value
  if ($null -ne $pg.imageinfo) { $byTitle[$pg.title] = $pg }
}
# the API normalises titles (underscores etc.) — map ours onto theirs
$normMap = @{}
if ($r.query.normalized) { foreach ($n in $r.query.normalized) { $normMap[$n.from] = $n.to } }

function Resolve-Page($title) {
  $t = $title
  if ($normMap.ContainsKey($t)) { $t = $normMap[$t] }
  if ($byTitle.ContainsKey($t)) { return $byTitle[$t] }
  # fall back to a loose match
  foreach ($k in $byTitle.Keys) { if ($k.Replace('_',' ') -eq $t.Replace('_',' ')) { return $byTitle[$k] } }
  return $null
}

$lines = @()
$fail = @()
foreach ($key in $map.Keys) {
  $file = $map[$key]
  $pg = Resolve-Page "File:$file"
  if ($null -eq $pg) { $fail += $file; continue }
  $ii = $pg.imageinfo[0]

  $orig = $ii.url                      # https://upload.wikimedia.org/wikipedia/commons/X/XY/Name.jpg
  $encName = $orig.Substring($orig.LastIndexOf('/') + 1)
  $thumbBase = ($orig -replace '/commons/', '/commons/thumb/') + '/'

  $useable = @($STEPS | Where-Object { $_ -lt $ii.width })
  $parts = @()
  foreach ($w in $useable) { $parts += "$thumbBase$($w)px-$encName ${w}w" }

  if ($ii.width -le 1280) {
    # A modest original (these are the small notebook folios, ~50-150 KB).
    # Serving the file itself beats snapping down to a 250px step.
    $src = $orig
    $parts += "$orig $($ii.width)w"
  } else {
    # Capped at the largest standard step on purpose: the originals run to
    # 100+ megapixels, and a hi-DPI browser would happily choose one.
    $displayW = ($useable | Measure-Object -Maximum).Maximum
    $src = "$thumbBase$($displayW)px-$encName"
  }
  $srcset = ($parts -join ', ')

  $credit = ''
  if ($ii.extmetadata.LicenseShortName) { $credit = $ii.extmetadata.LicenseShortName.value }
  $artist = ''
  if ($ii.extmetadata.Artist) { $artist = ($ii.extmetadata.Artist.value -replace '<[^>]+>','' -replace '\s+',' ').Trim() }

  $o = [ordered]@{
    src     = $src
    srcset  = $srcset
    w       = $ii.width
    h       = $ii.height
    file    = $pg.title
    page    = $ii.descriptionurl
    license = $credit
    artist  = $artist
  }
  $lines += "  $key`: $($o | ConvertTo-Json -Compress -Depth 4)"
}

$js = @"
/* ============================================================
   Image manifest - generated by tools/gen-images.ps1. Do not edit.
   Every plate is hotlinked from Wikimedia Commons at one of the
   standard thumbnail steps (250/500/960/1280/1920). Requesting
   any other width is rejected outright by the Wikimedia CDN.
   ============================================================ */
export const PLATES = {
$($lines -join ",`n")
};
"@

[System.IO.File]::WriteAllText(
  (Join-Path (Get-Location) 'src\js\images.js'),
  $js,
  (New-Object System.Text.UTF8Encoding($false))
)
Write-Output "wrote src\js\images.js  ($($lines.Count) plates)"
if ($fail.Count) { Write-Output "FAILED:"; $fail | ForEach-Object { Write-Output "  $_" } }
