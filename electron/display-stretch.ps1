# ST1M PORT4L — stretched resolution helper (Windows only).
#   info    : prints the current desktop mode and the modes the display driver exposes (JSON)
#   stretch : switches the desktop to W x H with the driver asked to STRETCH (no black bars),
#             as a temporary mode (CDS_FULLSCREEN: Windows itself reverts it when this process ends),
#             then waits for Apex to start and exit and restores the previous mode.
#   reset   : restores the registry (saved) mode immediately.
param([string]$Action = 'info', [int]$W = 0, [int]$H = 0, [int]$WaitSec = 180, [switch]$TestOnly)
$ErrorActionPreference = 'Stop'

Add-Type -TypeDefinition @'
using System;
using System.Runtime.InteropServices;
public static class Disp {
  [StructLayout(LayoutKind.Sequential, CharSet = CharSet.Ansi)]
  public struct DEVMODE {
    [MarshalAs(UnmanagedType.ByValTStr, SizeConst = 32)] public string dmDeviceName;
    public short dmSpecVersion; public short dmDriverVersion; public short dmSize; public short dmDriverExtra;
    public int dmFields;
    public int dmPositionX; public int dmPositionY; public int dmDisplayOrientation; public int dmDisplayFixedOutput;
    public short dmColor; public short dmDuplex; public short dmYResolution; public short dmTTOption; public short dmCollate;
    [MarshalAs(UnmanagedType.ByValTStr, SizeConst = 32)] public string dmFormName;
    public short dmLogPixels; public int dmBitsPerPel; public int dmPelsWidth; public int dmPelsHeight;
    public int dmDisplayFlags; public int dmDisplayFrequency; public int dmICMMethod; public int dmICMIntent;
    public int dmMediaType; public int dmDitherType; public int dmReserved1; public int dmReserved2;
    public int dmPanningWidth; public int dmPanningHeight;
  }
  [DllImport("user32.dll", EntryPoint = "EnumDisplaySettingsA", CharSet = CharSet.Ansi)]
  public static extern bool EnumDisplaySettings(string dev, int mode, ref DEVMODE dm);
  [DllImport("user32.dll", EntryPoint = "ChangeDisplaySettingsExA", CharSet = CharSet.Ansi)]
  public static extern int ChangeDisplaySettingsEx(string dev, ref DEVMODE dm, IntPtr hwnd, int flags, IntPtr lp);
  [DllImport("user32.dll", EntryPoint = "ChangeDisplaySettingsExA", CharSet = CharSet.Ansi)]
  public static extern int ResetDisplaySettings(string dev, IntPtr dm, IntPtr hwnd, int flags, IntPtr lp);
  public static DEVMODE Create() { DEVMODE d = new DEVMODE(); d.dmSize = (short)Marshal.SizeOf(typeof(DEVMODE)); return d; }
}

public static class Ccd {
  [DllImport("user32.dll")] static extern int GetDisplayConfigBufferSizes(uint flags, out uint np, out uint nm);
  [DllImport("user32.dll")] static extern int QueryDisplayConfig(uint flags, ref uint np, IntPtr paths, ref uint nm, IntPtr modes, IntPtr topo);
  [DllImport("user32.dll")] static extern int SetDisplayConfig(uint np, IntPtr paths, uint nm, IntPtr modes, uint flags);
  const int PATH = 72, MODE = 64, SCALING = 44;
  // newScaling > 0: write it on the primary path. sdc != 0: call SetDisplayConfig (0x40 validate, 0x80 apply).
  // Returns the previous scaling of the primary path (-1 = not found).
  public static int Run(int newScaling, uint sdc, out int rc, out int found) {
    rc = 0; found = 0;
    uint np, nm;
    if (GetDisplayConfigBufferSizes(2, out np, out nm) != 0) { rc = -1; return -1; }
    IntPtr paths = Marshal.AllocHGlobal((int)np * PATH), modes = Marshal.AllocHGlobal((int)nm * MODE);
    try {
      if (QueryDisplayConfig(2, ref np, paths, ref nm, modes, IntPtr.Zero) != 0) { rc = -2; return -1; }
      int lo = 0, hi = 0; uint sid = 0; bool got = false;
      for (int i = 0; i < nm; i++) {
        IntPtr m = IntPtr.Add(modes, i * MODE);
        if (Marshal.ReadInt32(m, 0) == 1 && Marshal.ReadInt32(m, 28) == 0 && Marshal.ReadInt32(m, 32) == 0) { sid = (uint)Marshal.ReadInt32(m, 4); lo = Marshal.ReadInt32(m, 8); hi = Marshal.ReadInt32(m, 12); got = true; break; }
      }
      if (!got) { rc = -3; return -1; }
      for (int i = 0; i < np; i++) {
        IntPtr p = IntPtr.Add(paths, i * PATH);
        if (Marshal.ReadInt32(p, 0) == lo && Marshal.ReadInt32(p, 4) == hi && (uint)Marshal.ReadInt32(p, 8) == sid) {
          found = 1; int old = Marshal.ReadInt32(p, SCALING);
          if (newScaling > 0) Marshal.WriteInt32(p, SCALING, newScaling);
          if (sdc != 0) rc = SetDisplayConfig(np, paths, nm, modes, sdc | 0x20 | 0x400);
          return old;
        }
      }
      rc = -4; return -1;
    } finally { Marshal.FreeHGlobal(paths); Marshal.FreeHGlobal(modes); }
  }
}
'@

$CURRENT = -1
function Out-Line($o) { [Console]::Out.WriteLine(($o | ConvertTo-Json -Compress -Depth 4)); [Console]::Out.Flush() }
function Get-Current {
  $d = [Disp]::Create()
  if (-not [Disp]::EnumDisplaySettings([NullString]::Value, $CURRENT, [ref]$d)) { throw 'EnumDisplaySettings failed' }
  return $d
}

switch ($Action) {
  'info' {
    $c = Get-Current
    $seen = @{}; $modes = @()
    for ($i = 0; ; $i++) {
      $d = [Disp]::Create()
      if (-not [Disp]::EnumDisplaySettings([NullString]::Value, $i, [ref]$d)) { break }
      if ($d.dmBitsPerPel -lt 32) { continue }
      $k = "$($d.dmPelsWidth)x$($d.dmPelsHeight)"
      if (-not $seen.ContainsKey($k)) { $seen[$k] = 1; $modes += , @($d.dmPelsWidth, $d.dmPelsHeight) }
    }
    Out-Line @{ ok = $true; current = @($c.dmPelsWidth, $c.dmPelsHeight, $c.dmDisplayFrequency); modes = $modes }
  }
  'scaling' {   # read-only: 1 identity, 2 centered, 3 stretched (full screen), 4 keep aspect ratio (black bars)
    $rc = 0; $found = 0
    $old = [Ccd]::Run(0, 0, [ref]$rc, [ref]$found)
    Out-Line @{ ok = ($found -eq 1); scaling = $old; code = $rc }
  }
  'reset' {
    $r =[Disp]::ResetDisplaySettings([NullString]::Value, [IntPtr]::Zero, [IntPtr]::Zero, 0, [IntPtr]::Zero)
    Out-Line @{ ok = ($r -eq 0); code = $r }
  }
  'stretch' {
    if ($W -lt 640 -or $H -lt 480 -or $W -gt 7680 -or $H -gt 4320) { Out-Line @{ ok = $false; error = 'size' }; exit 2 }
    $c = Get-Current
    $m = Get-Current
    $m.dmPelsWidth = $W; $m.dmPelsHeight = $H
    $m.dmDisplayFixedOutput = 1   # DMDFO_STRETCH: the driver scales the image to the full panel
    $m.dmFields = 0x80000 -bor 0x100000 -bor 0x400000 -bor 0x20000000   # width | height | frequency | fixed output
    $test = [Disp]::ChangeDisplaySettingsEx([NullString]::Value, [ref]$m, [IntPtr]::Zero, 0x2, [IntPtr]::Zero)   # CDS_TEST
    if ($test -ne 0) { Out-Line @{ ok = $false; error = 'unsupported'; code = $test; current = @($c.dmPelsWidth, $c.dmPelsHeight) }; exit 3 }
    $rc = 0; $found = 0
    $orig = [Ccd]::Run(0, 0, [ref]$rc, [ref]$found)   # previous Windows scaling mode of the primary display
    if ($TestOnly) {
      [void][Ccd]::Run(3, 0x40, [ref]$rc, [ref]$found)   # SDC_VALIDATE: checks that "stretched" is accepted, applies nothing
      Out-Line @{ ok = $true; test = $true; supported = @($W, $H); scaling = $orig; scalingValid = (($found -eq 1) -and ($rc -eq 0)); scalingCode = $rc }; exit 0
    }
    $r = [Disp]::ChangeDisplaySettingsEx([NullString]::Value, [ref]$m, [IntPtr]::Zero, 0x4, [IntPtr]::Zero)      # CDS_FULLSCREEN = temporary
    if ($r -ne 0) { Out-Line @{ ok = $false; error = 'apply'; code = $r }; exit 4 }
    $sc = 0
    if ($orig -gt 0) { $rc = 0; $found = 0; [void][Ccd]::Run(3, 0x80, [ref]$rc, [ref]$found); $sc = $rc }   # SDC_APPLY: stretched scaling, not saved to the display database
    Out-Line @{ ok = $true; applied = @($W, $H); previous = @($c.dmPelsWidth, $c.dmPelsHeight); scalingBefore = $orig; scalingCode = $sc }
    try {
      $t0 = Get-Date
      while (-not (Get-Process -Name r5apex -ErrorAction SilentlyContinue)) {
        if (((Get-Date) - $t0).TotalSeconds -gt $WaitSec) { break }
        Start-Sleep -Milliseconds 700
      }
      while (Get-Process -Name r5apex -ErrorAction SilentlyContinue) { Start-Sleep -Seconds 2 }
    } finally {
      if ($orig -gt 0 -and $orig -ne 3) { $r2 = 0; $f2 = 0; [void][Ccd]::Run($orig, 0x80, [ref]$r2, [ref]$f2) }   # put the previous scaling back
      [void][Disp]::ResetDisplaySettings([NullString]::Value, [IntPtr]::Zero, [IntPtr]::Zero, 0, [IntPtr]::Zero)
      Out-Line @{ ok = $true; restored = $true }
    }
  }
  default { Out-Line @{ ok = $false; error = 'action' }; exit 1 }
}
