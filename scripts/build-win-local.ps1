# Build the Windows installer locally WITHOUT admin / Developer Mode
# (electron-builder's winCodeSign archive contains symlinks that need elevated privileges).
# On GitHub Actions use `npm run dist` instead.
$ErrorActionPreference = 'Stop'
Set-Location (Split-Path $PSScriptRoot -Parent)
$env:CSC_IDENTITY_AUTO_DISCOVERY = 'false'
Remove-Item dist\win-unpacked -Recurse -Force -ErrorAction SilentlyContinue
npx electron-builder --win --dir --publish never --config.win.signAndEditExecutable=false
$rc = Get-ChildItem "$env:LOCALAPPDATA\electron-builder\Cache\winCodeSign" -Recurse -Filter rcedit-x64.exe | Select-Object -First 1
if (-not $rc) { throw 'rcedit-x64.exe not found in the electron-builder cache (run `npm run dist` once to download it).' }
& $rc.FullName "dist\win-unpacked\ST1M POT4L.exe" --set-icon "dist\.icon-ico\icon.ico" --set-version-string ProductName "ST1M POT4L" --set-version-string FileDescription "ST1M POT4L by idZy" --set-version-string CompanyName "idZy"

# The pre-packaged flow does not emit app-update.yml (the normal `npm run dist` does): write it from package.json.
$pkg = Get-Content package.json -Raw | ConvertFrom-Json
$pub = $pkg.build.publish
if ($pub) {
  $yml = "provider: $($pub[0].provider)`nowner: $($pub[0].owner)`nrepo: $($pub[0].repo)`nupdaterCacheDirName: $($pkg.name)-updater`n"
  $dst = Join-Path $PWD 'dist/win-unpacked/resources/app-update.yml'
  [IO.File]::WriteAllText($dst, $yml)
}

npx electron-builder --win --prepackaged dist/win-unpacked --publish never --config.win.signAndEditExecutable=false
Get-ChildItem dist -File -Filter *.exe | Select-Object Name, Length
