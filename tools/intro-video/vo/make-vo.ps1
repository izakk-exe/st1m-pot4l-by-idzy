# Generate the voice-over WAV files with the Windows OneCore text-to-speech voices (offline, free).
#   powershell -ExecutionPolicy Bypass -File tools/intro-video/vo/make-vo.ps1 [-Only intro|tiktok]
# To use your OWN recording instead, drop a WAV named like the generated one (e.g. vo/tiktok/03.wav): the renderer uses whatever file is there.
param([string]$Only = '')
$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Runtime.WindowsRuntime
$null = [Windows.Media.SpeechSynthesis.SpeechSynthesizer, Windows.Media.SpeechSynthesis, ContentType = WindowsRuntime]
$null = [Windows.Storage.Streams.DataReader, Windows.Storage.Streams, ContentType = WindowsRuntime]
$asTask = [System.WindowsRuntimeSystemExtensions].GetMethods() | Where-Object { $_.Name -eq 'AsTask' -and $_.GetParameters().Count -eq 1 -and $_.GetParameters()[0].ParameterType.Name -eq 'IAsyncOperation`1' } | Select-Object -First 1
function Await($op, $type) { $t = $asTask.MakeGenericMethod($type).Invoke($null, @($op)); $t.Wait(-1) | Out-Null; $t.Result }
$cfg = Get-Content (Join-Path $PSScriptRoot 'script.json') -Raw -Encoding UTF8 | ConvertFrom-Json
foreach ($name in $cfg.sets.PSObject.Properties.Name) {
  if ($Only -and $Only -ne $name) { continue }
  $vs = $cfg.sets.$name; $lang = $vs.lang
  $voice = [Windows.Media.SpeechSynthesis.SpeechSynthesizer]::AllVoices | Where-Object { $_.DisplayName -eq $cfg.voices.$lang } | Select-Object -First 1
  if (-not $voice) { throw "Voice not found: $($cfg.voices.$lang)" }
  $dir = Join-Path $PSScriptRoot $name; New-Item -ItemType Directory -Force $dir | Out-Null
  $synth = New-Object Windows.Media.SpeechSynthesis.SpeechSynthesizer; $synth.Voice = $voice; $synth.Options.SpeakingRate = [double]$cfg.rate.$lang
  $report = @()
  foreach ($line in $vs.lines) {
    $stream = Await ($synth.SynthesizeTextToStreamAsync($line.text)) ([Windows.Media.SpeechSynthesis.SpeechSynthesisStream])
    $size = [uint32]$stream.Size; $reader = New-Object Windows.Storage.Streams.DataReader($stream.GetInputStreamAt(0))
    $null = Await ($reader.LoadAsync($size)) ([uint32]); $bytes = New-Object byte[] $size; $reader.ReadBytes($bytes)
    $file = Join-Path $dir ($line.id + '.wav'); [IO.File]::WriteAllBytes($file, $bytes)
    $byteRate = [BitConverter]::ToInt32($bytes, 28); $dur = ($size - 44) / $byteRate
    $report += [pscustomobject]@{ id = $line.id; dur = [math]::Round($dur, 2); max = $line.max; fit = if ($dur -le $line.max) { 'ok' } else { 'x{0:N2}' -f ($dur / $line.max) }; text = $line.text }
  }
  "== $name ($($voice.DisplayName), $lang) =="; $report | Format-Table -AutoSize | Out-String -Width 200
}
