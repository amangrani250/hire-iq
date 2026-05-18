param([switch]$Silent)
function Log { param([string]$Msg) if (-not $Silent) { Write-Host "  [MEMORY] $Msg" -ForegroundColor Cyan } }
$Root = Resolve-Path "$PSScriptRoot/../.."
$Mem = "$Root/.opencode/memory"
$Now = Get-Date -Format 'yyyy-MM-dd HH:mm'

Log "Scanning project structure..."

# Frontend
$feFiles = Get-ChildItem "$Root/frontend/src" -Recurse -File | Where-Object { $_.Extension -in '.ts','.tsx','.css' } | Sort-Object FullName
$feCount = $feFiles.Count
$feLines = ($feFiles | ForEach-Object { (Get-Content $_.FullName | Measure-Object -Line).Lines } | Measure-Object -Sum).Sum
$feDir = "$Root\frontend\src\"

$feTree = ""
$feFiles | ForEach-Object {
    $rel = $_.FullName.Substring($feDir.Length)
    $spaces = ($rel.Split('\').Length - 1) * 2
    $feTree = $feTree + (" " * $spaces) + "+-- " + $rel.Replace('\', '/') + "`n"
}

$feContent = "# Frontend Structure (Auto-generated: $Now)"
$feContent = $feContent + "`n`n## Summary"
$feContent = $feContent + "`n- **Files**: $feCount source files"
$feContent = $feContent + "`n- **Lines of code**: $feLines"
$feContent = $feContent + "`n- **Framework**: React 18 + TypeScript 6 + Tailwind CSS"
$feContent = $feContent + "`n`n## File Tree"
$feContent = $feContent + "`n````"
$feContent = $feContent + "`nfrontend/src/"
$feContent = $feContent + "`n$feTree"
$feContent = $feContent + "````"

Set-Content -Path "$Mem/frontend-structure.md" -Value $feContent -Encoding utf8
Log "  -> frontend-structure.md ($feCount files, $feLines lines)"

# Backend
$beFiles = Get-ChildItem "$Root/backend" -Recurse -File -Filter '*.py' | Where-Object { $_.DirectoryName -notmatch 'venv|__pycache__' -and $_.Name -notlike '*.pyc' } | Sort-Object FullName
$beCount = $beFiles.Count
$beLines = ($beFiles | ForEach-Object { (Get-Content $_.FullName | Measure-Object -Line).Lines } | Measure-Object -Sum).Sum
$beDir = "$Root\backend\"

$beTree = ""
$beFiles | ForEach-Object {
    $rel = $_.FullName.Substring($beDir.Length)
    $spaces = ($rel.Split('\').Length - 1) * 2
    $beTree = $beTree + (" " * $spaces) + "+-- " + $rel.Replace('\', '/') + "`n"
}

$beContent = "# Backend Structure (Auto-generated: $Now)"
$beContent = $beContent + "`n`n## Summary"
$beContent = $beContent + "`n- **Files**: $beCount source files"
$beContent = $beContent + "`n- **Lines of code**: $beLines"
$beContent = $beContent + "`n- **Framework**: Python 3.12 + FastAPI 0.111"
$beContent = $beContent + "`n`n## File Tree"
$beContent = $beContent + "`n````"
$beContent = $beContent + "`nbackend/"
$beContent = $beContent + "`n$beTree"
$beContent = $beContent + "````"

Set-Content -Path "$Mem/backend-structure.md" -Value $beContent -Encoding utf8
Log "  -> backend-structure.md ($beCount files, $beLines lines)"

# Dependencies
$deps = "# Dependencies & Versions (Auto-generated: $Now)"
$deps = $deps + "`n`n## Frontend (Production)`n| Package | Version |`n|---------|---------|"
try { $pkg = Get-Content "$Root/frontend/package.json" -Raw | ConvertFrom-Json
    $pkg.dependencies.PSObject.Properties | Sort-Object Name | ForEach-Object { $deps = $deps + "`n| $($_.Name) | $($_.Value) |" }
    $deps = $deps + "`n`n## Frontend (Dev)`n| Package | Version |`n|---------|---------|"
    $pkg.devDependencies.PSObject.Properties | Sort-Object Name | ForEach-Object { $deps = $deps + "`n| $($_.Name) | $($_.Value) |" }
} catch { $deps = $deps + "`n| Error reading package.json | |" }

$deps = $deps + "`n`n## Backend`n| Package | Version |`n|---------|---------|"
try { Get-Content "$Root/backend/requirements.txt" | Where-Object { $_ -match '^[a-zA-Z]' } | ForEach-Object {
    if ($_ -match '^([a-zA-Z0-9_.-]+)\s*([><=!~]+\s*\S+)?') { $deps = $deps + "`n| $($matches[1]) | " + ($matches[2] -replace '^[><=!~]+', '') + " |" }
}} catch { $deps = $deps + "`n| Error reading requirements.txt | |" }

Set-Content -Path "$Mem/dependencies.md" -Value $deps -Encoding utf8
Log "  -> dependencies.md (deps scanned)"
Log "Memory is fresh. Agents will read these for token-efficient context."
