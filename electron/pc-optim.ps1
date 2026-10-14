# ST1M PORT4L by idZy - Windows tweaks for Apex Legends (PC optimisation tab).
# Everything here is per-user (HKCU) or a power-plan switch: no administrator rights, nothing outside these keys.
# Every value is saved to a backup file the first time it is changed, so -Action restore puts the PC back exactly.
# Output: one JSON line.
param(
  [ValidateSet('status', 'apply', 'restore')][string]$Action = 'status',
  [string]$Tweaks = '',
  [string]$Exe = '',
  [string]$Backup = ''
)
$ErrorActionPreference = 'Stop'

$HIGH_PERF = '8c5e7fda-e8bf-4a96-9a85-a6e23a8c635c'
$ULTIMATE = 'e9a42b02-d5df-448d-aa00-03f14749eb61'
$FSO_FLAGS = '~ DISABLEDXMAXIMIZEDWINDOWEDMODE'

function Out-Json($o) { $o | ConvertTo-Json -Compress -Depth 6 | Write-Output }

# ---------------------------------------------------------------- registry helpers
function Get-Reg($path, $name) {
  try { $v = Get-ItemProperty -Path $path -Name $name -ErrorAction Stop; return @{ exists = $true; value = $v.$name } }
  catch { return @{ exists = $false; value = $null } }
}
function Set-Reg($path, $name, $value, $type) {
  if (-not (Test-Path $path)) { New-Item -Path $path -Force | Out-Null }
  New-ItemProperty -Path $path -Name $name -Value $value -PropertyType $type -Force | Out-Null
}

# the registry values each tweak touches: [path, name, value, type]
function Reg-Of($id) {
  $l = @()
  switch ($id) {
    'gamemode' { $l = @(@('HKCU:\Software\Microsoft\GameBar', 'AutoGameModeEnabled', 1, 'DWord'), @('HKCU:\Software\Microsoft\GameBar', 'AllowAutoGameMode', 1, 'DWord')) }
    'dvr' { $l = @(@('HKCU:\System\GameConfigStore', 'GameDVR_Enabled', 0, 'DWord'), @('HKCU:\Software\Microsoft\Windows\CurrentVersion\GameDVR', 'AppCaptureEnabled', 0, 'DWord')) }
    'transparency' { $l = @(, @('HKCU:\Software\Microsoft\Windows\CurrentVersion\Themes\Personalize', 'EnableTransparency', 0, 'DWord')) }
    'gpupref' { if ($Exe) { $l = @(, @('HKCU:\Software\Microsoft\DirectX\UserGpuPreferences', $Exe, 'GpuPreference=2;', 'String')) } }
    'fso' { if ($Exe) { $l = @(, @('HKCU:\Software\Microsoft\Windows NT\CurrentVersion\AppCompatFlags\Layers', $Exe, $FSO_FLAGS, 'String')) } }
  }
  return , $l   # the comma keeps PowerShell from unrolling a one-entry list
}

function Active-Scheme {
  $out = (powercfg /getactivescheme) 2>$null
  if ("$out" -match '([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12})') { return $Matches[1].ToLower() }
  return $null
}
function Scheme-Exists($guid) { $l = (powercfg /list) 2>$null; return ("$l" -match [regex]::Escape($guid)) }

function Load-Backup {
  if ($Backup -and (Test-Path $Backup)) { try { return (Get-Content $Backup -Raw | ConvertFrom-Json) } catch {} }
  return $null
}

# ---------------------------------------------------------------- status: which tweaks are currently in place
function Tweak-On($id, $bk) {
  if ($id -eq 'power') {
    $a = Active-Scheme
    return ($a -eq $HIGH_PERF -or $a -eq $ULTIMATE -or ($bk -and $bk.createdScheme -and $a -eq $bk.createdScheme))
  }
  $regs = Reg-Of $id
  if (-not $regs.Count) { return $false }
  foreach ($r in $regs) { $c = Get-Reg $r[0] $r[1]; if (-not $c.exists -or "$($c.value)" -ne "$($r[2])") { return $false } }
  return $true
}

$ids = @('gamemode', 'dvr', 'power', 'gpupref', 'fso', 'transparency')

if ($Action -eq 'status') {
  $bk = Load-Backup
  $st = @{}; foreach ($i in $ids) { $st[$i] = [bool](Tweak-On $i $bk) }
  Out-Json @{ ok = $true; tweaks = $st; backup = [bool]$bk; scheme = (Active-Scheme) }
  exit 0
}

if ($Action -eq 'apply') {
  $bk = Load-Backup
  $reg = @(); $prevScheme = $null; $created = $null
  if ($bk) { $reg = @($bk.reg); $prevScheme = $bk.prevScheme; $created = $bk.createdScheme }
  $res = @{}
  foreach ($id in ($Tweaks -split ',' | Where-Object { $ids -contains $_ })) {
    try {
      if ($id -eq 'power') {
        $cur = Active-Scheme
        if (-not $prevScheme) { $prevScheme = $cur }
        $target = $null
        if ($created -and (Scheme-Exists $created)) { $target = $created }
        if (-not $target) {   # "Ultimate performance" is hidden on most PCs: duplicate it once, else fall back to High performance
          $dup = (powercfg -duplicatescheme $ULTIMATE) 2>$null
          if ("$dup" -match '([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12})') { $created = $Matches[1].ToLower(); $target = $created }
          elseif (Scheme-Exists $HIGH_PERF) { $target = $HIGH_PERF }
        }
        if (-not $target) { $res[$id] = 'unavailable'; continue }
        powercfg /setactive $target 2>$null | Out-Null
        $res[$id] = $(if ((Active-Scheme) -eq $target) { 'ok' } else { 'failed' })
        continue
      }
      $regs = Reg-Of $id
      if (-not $regs.Count) { $res[$id] = 'no-exe'; continue }
      foreach ($r in $regs) {
        $known = $reg | Where-Object { $_.path -eq $r[0] -and $_.name -eq $r[1] }
        if (-not $known) { $c = Get-Reg $r[0] $r[1]; $reg += [pscustomobject]@{ path = $r[0]; name = $r[1]; existed = $c.exists; value = $c.value; type = $r[3] } }
        Set-Reg $r[0] $r[1] $r[2] $r[3]
      }
      $res[$id] = 'ok'
    } catch { $res[$id] = 'failed' }
  }
  if ($Backup) {
    $dir = Split-Path $Backup -Parent; if ($dir -and -not (Test-Path $dir)) { New-Item -ItemType Directory -Path $dir -Force | Out-Null }
    @{ reg = $reg; prevScheme = $prevScheme; createdScheme = $created } | ConvertTo-Json -Depth 6 | Set-Content -Path $Backup -Encoding UTF8
  }
  Out-Json @{ ok = $true; results = $res }
  exit 0
}

if ($Action -eq 'restore') {
  $bk = Load-Backup
  if (-not $bk) { Out-Json @{ ok = $false; error = 'no-backup' }; exit 0 }
  $failed = 0
  foreach ($e in @($bk.reg)) {
    try {
      if ($e.existed) { Set-Reg $e.path $e.name $e.value $e.type }
      else { Remove-ItemProperty -Path $e.path -Name $e.name -ErrorAction SilentlyContinue }
    } catch { $failed++ }
  }
  if ($bk.prevScheme) { powercfg /setactive $bk.prevScheme 2>$null | Out-Null }
  if ($bk.createdScheme -and (Active-Scheme) -ne $bk.createdScheme) { powercfg /delete $bk.createdScheme 2>$null | Out-Null }
  Remove-Item $Backup -ErrorAction SilentlyContinue
  Out-Json @{ ok = ($failed -eq 0); failed = $failed }
  exit 0
}
