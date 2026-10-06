# ST1M POT4L — passive input helper for the keyboard/mouse overlay.
# Reads Windows Raw Input (same mechanism OBS input overlays use). It only reports:
#   K <vk> <1|0>   W A S D, Shift, Ctrl, Space, C   (every other key is ignored and never leaves this process)
#   B <1..5> <1|0>  mouse buttons
#   W <1|-1>        mouse wheel tick (up / down)
#   M <dx> <dy>     relative mouse movement (batched ~120 Hz)
# Exits when its stdin is closed (the app died).
$src = @"
using System;
using System.Collections.Generic;
using System.Runtime.InteropServices;
using System.Threading;
using System.Windows.Forms;

public class StInput : NativeWindow {
  [StructLayout(LayoutKind.Sequential)]
  struct RID { public ushort page; public ushort usage; public uint flags; public IntPtr target; }
  [DllImport("user32.dll", SetLastError = true)]
  static extern bool RegisterRawInputDevices(RID[] d, uint n, uint size);
  [DllImport("user32.dll")]
  static extern uint GetRawInputData(IntPtr h, uint cmd, byte[] data, ref uint size, uint hdr);

  static readonly HashSet<int> Allowed = new HashSet<int> { 0x57, 0x41, 0x53, 0x44, 0x10, 0x11, 0x20, 0x43 };
  static readonly object Gate = new object();
  int dx, dy;

  static void Out(string s) {
    lock (Gate) { Console.Out.WriteLine(s); Console.Out.Flush(); }
  }

  protected override void WndProc(ref Message m) {
    if (m.Msg == 0x00FF) { try { OnInput(m.LParam); } catch (Exception) { } }
    base.WndProc(ref m);
  }

  void OnInput(IntPtr lp) {
    uint size = 0;
    uint hdr = (uint)(IntPtr.Size == 8 ? 24 : 16);
    GetRawInputData(lp, 0x10000003, null, ref size, hdr);
    if (size == 0) return;
    byte[] buf = new byte[size];
    if (GetRawInputData(lp, 0x10000003, buf, ref size, hdr) != size) return;
    int type = BitConverter.ToInt32(buf, 0);
    int o = (int)hdr;
    if (type == 0) {
      ushort flags = BitConverter.ToUInt16(buf, o);
      ushort bf = BitConverter.ToUInt16(buf, o + 4);
      int x = BitConverter.ToInt32(buf, o + 12);
      int y = BitConverter.ToInt32(buf, o + 16);
      if ((flags & 1) == 0) { dx += x; dy += y; }
      if ((bf & 0x01) != 0) Out("B 1 1");
      if ((bf & 0x02) != 0) Out("B 1 0");
      if ((bf & 0x04) != 0) Out("B 2 1");
      if ((bf & 0x08) != 0) Out("B 2 0");
      if ((bf & 0x10) != 0) Out("B 3 1");
      if ((bf & 0x20) != 0) Out("B 3 0");
      if ((bf & 0x40) != 0) Out("B 4 1");
      if ((bf & 0x80) != 0) Out("B 4 0");
      if ((bf & 0x100) != 0) Out("B 5 1");
      if ((bf & 0x200) != 0) Out("B 5 0");
      if ((bf & 0x400) != 0) { short wd = BitConverter.ToInt16(buf, o + 6); Out("W " + (wd > 0 ? "1" : "-1")); }
    } else if (type == 1) {
      ushort flags = BitConverter.ToUInt16(buf, o + 2);
      int vk = BitConverter.ToUInt16(buf, o + 6);
      if (Allowed.Contains(vk)) Out("K " + vk + " " + (((flags & 1) != 0) ? "0" : "1"));
    }
  }

  void Flush() {
    if (dx != 0 || dy != 0) { int a = dx, b = dy; dx = 0; dy = 0; Out("M " + a + " " + b); }
  }

  public static void Run() {
    StInput w = new StInput();
    CreateParams cp = new CreateParams();
    cp.Parent = new IntPtr(-3); // HWND_MESSAGE
    w.CreateHandle(cp);
    RID[] d = new RID[2];
    d[0].page = 1; d[0].usage = 6; d[0].flags = 0x100; d[0].target = w.Handle; // keyboard, INPUTSINK
    d[1].page = 1; d[1].usage = 2; d[1].flags = 0x100; d[1].target = w.Handle; // mouse, INPUTSINK
    if (!RegisterRawInputDevices(d, 2, (uint)Marshal.SizeOf(typeof(RID)))) { Out("E register-failed"); return; }
    System.Windows.Forms.Timer t = new System.Windows.Forms.Timer();
    t.Interval = 8;
    t.Tick += delegate { w.Flush(); };
    t.Start();
    Thread th = new Thread(delegate () { while (Console.In.ReadLine() != null) { } Environment.Exit(0); });
    th.IsBackground = true; th.Start();
    Out("READY");
    Application.Run();
  }
}
"@
Add-Type -TypeDefinition $src -ReferencedAssemblies System.Windows.Forms, System.Drawing
[StInput]::Run()
