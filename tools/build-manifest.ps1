$ErrorActionPreference = 'Stop'
$ua = @{ 'User-Agent' = 'SaperVedere/1.0 (research)' }

$titles = @(
  # paintings
  'Mona Lisa, by Leonardo da Vinci, from C2RMF retouched.jpg',
  'Leonardo da Vinci (1452-1519) - The Last Supper (1495-1498).jpg',
  'Lady with an Ermine - Leonardo da Vinci (adjusted levels).jpg',
  'Leonardo Da Vinci - Vergine delle Rocce (Louvre).jpg',
  'Leonardo da Vinci - Vergine delle Rocce (National Gallery London).jpg',
  'Leonardo da Vinci - Saint John the Baptist C2RMF retouched.jpg',
  'Leonardo da Vinci - Ginevra de'' Benci - Google Art Project.jpg',
  'Leonardo da Vinci - Annunciazione - Google Art Project.jpg',
  'Leonardo da Vinci - Adorazione dei Magi - Google Art Project.jpg',
  'Leonardo da Vinci - Saint Jerome.jpg',
  'Leonardo da Vinci - Virgin and Child with St Anne C2RMF retouched.jpg',
  'Leonardo da Vinci - Portrait of a Musician - Pinacoteca Ambrosiana.jpg',
  'The Baptism of Christ (Verrocchio and Leonardo).jpg',
  'Leonardo Da Vinci - Madonna Benois.jpg',
  'Leonardo da vinci - La scapigliata.jpg',
  # folios
  'Da Vinci Vitruve Luc Viatour.jpg',
  'Leonardo da Vinci helicopter and lifting wing.jpg',
  'Design for a Flying Machine.jpg',
  'Leonardo da Vinci - Studies of the foetus in the womb.jpg',
  'Leonardo da Vinci - A deluge - Google Art Project.jpg',
  'Studies of Water passing Obstacles and falling.jpg',
  'Leonardo da Vinci - RCIN 912363, Cats, lions, and a dragon c.1517-18.jpg',
  'Leonardo da Vinci - A star-of-Bethlehem and other plants, c.1506-12.jpg',
  'Leonardo da Vinci - 1860,0616.99, Studies of military tank-like machines.jpg',
  'LeonardoCardDrawing.jpg',
  'Leonardo da Vinci Self Propelled Cart.jpg',
  'Leonardo da Vinci''s Giant Crossbow - design.jpg',
  'Leonardo da vinci, Study of a central church.jpg',
  'Leonardo da Vinci - Manuscript page on the Sforza monument - WGA12879.jpg',
  'Leonardo da Vinci - RCIN 912606, A head of a man in profile, with proportions indicated c.1490.jpg',
  'Study of a Tuscan Landscape.jpg',
  'Leonardo da Vinci - Study of Drapery, c1475-1482 -Fondation Custodia 6632.jpg',
  'Leonardo da vinci, Grotesque head.jpg',
  'Leonardo da Vinci - Codex Atlanticus folio 307v.jpg',
  'Leonardo self.jpg',
  'Leonardo da Vinci - RCIN 912601, The proportions of the head, and a standing nude c.1490.jpg'
)

$body = @{
  action = 'query'; format = 'json'; prop = 'imageinfo'
  iiprop = 'url|size|extmetadata'; iiurlwidth = '1600'
  titles = ($titles | ForEach-Object { "File:$_" }) -join '|'
}
$r = Invoke-RestMethod -Method Post -Uri 'https://commons.wikimedia.org/w/api.php' -Body $body -Headers $ua

$out = @()
foreach ($p in $r.query.pages.PSObject.Properties) {
  $pg = $p.Value
  if ($null -ne $pg.missing -or $null -eq $pg.imageinfo) {
    Write-Output "MISSING: $($pg.title)"
    continue
  }
  $ii = $pg.imageinfo[0]
  $lic = ''
  if ($ii.extmetadata.LicenseShortName) { $lic = $ii.extmetadata.LicenseShortName.value }
  $out += [pscustomobject]@{
    title = $pg.title
    thumb = $ii.thumburl
    w = $ii.width
    h = $ii.height
    license = $lic
    page = $ii.descriptionurl
  }
}
$out | ConvertTo-Json -Depth 4 | Out-File -Encoding utf8 'tools\manifest.json'
Write-Output "OK: $($out.Count) entries -> tools\manifest.json"
$out | ForEach-Object { Write-Output ("{0}`n    {1}`n    {2}" -f $_.title, $_.thumb, $_.license) }
