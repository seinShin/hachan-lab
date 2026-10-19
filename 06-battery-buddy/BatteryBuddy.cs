// 배터리 친구: 윈도우 트레이(시계 옆)에 사는 캐릭터. 배터리 잔량에 따라 표정이 바뀐다.
// 빌드: build.cmd — 윈도우에 기본으로 들어 있는 C# 컴파일러(csc.exe)만 쓴다. 따로 설치할 것 없음.
// 이 컴파일러는 C# 5까지만 알아서 $"..." 문자열, ?. 같은 최신 문법은 쓰지 않는다.
//
// 실행 옵션 (테스트용)
//   --pct 15          배터리를 15%로 가정 (우는 얼굴 보기)
//   --charging        충전 중으로 가정
//   --preview a.png   모든 표정을 이미지 한 장으로 저장하고 끝
//   --make-ico a.ico  프로그램 아이콘(.ico) 만들고 끝 (build.cmd가 씀)

using System;
using System.Collections.Generic;
using System.Drawing;
using System.Drawing.Drawing2D;
using System.Drawing.Imaging;
using System.Drawing.Text;
using System.IO;
using System.Reflection;
using System.Runtime.InteropServices;
using System.Threading;
using System.Windows.Forms;
using Microsoft.Win32;

[assembly: AssemblyTitle("배터리 친구")]
[assembly: AssemblyProduct("배터리 친구 (hachan-lab 06)")]
[assembly: AssemblyVersion("1.0.0.0")]

namespace BatteryBuddy
{
    enum Mood { Happy, Smile, Worried, Crying, Charging, NoBattery }

    // ── 배터리 상태 → 표정 ──
    class Status
    {
        public int Pct;
        public bool Charging;
        public bool HasBattery;
        public Mood Mood;

        public const int LOW = 20;   // 이 아래면 울음

        public static Status Read(int forcePct, bool forceCharging)
        {
            PowerStatus ps = SystemInformation.PowerStatus;
            Status s = new Status();
            // 배터리 없는 데스크톱은 NoSystemBattery, 가상머신 등은 Unknown(255)으로 나옴
            s.HasBattery = (ps.BatteryChargeStatus & BatteryChargeStatus.NoSystemBattery) == 0
                && ps.BatteryChargeStatus != BatteryChargeStatus.Unknown;
            s.Pct = Math.Min(100, (int)Math.Round(ps.BatteryLifePercent * 100));
            s.Charging = ps.PowerLineStatus == PowerLineStatus.Online;

            if (forcePct >= 0) { s.HasBattery = true; s.Pct = forcePct; s.Charging = forceCharging; }
            else if (forceCharging) s.Charging = true;

            if (!s.HasBattery) s.Mood = Mood.NoBattery;
            else if (s.Charging) s.Mood = Mood.Charging;
            else if (s.Pct >= 80) s.Mood = Mood.Happy;
            else if (s.Pct >= 50) s.Mood = Mood.Smile;
            else if (s.Pct >= LOW) s.Mood = Mood.Worried;
            else s.Mood = Mood.Crying;
            return s;
        }

        public string Line()
        {
            switch (Mood)
            {
                case Mood.Happy: return "기분 최고! 뭐든 할 수 있어";
                case Mood.Smile: return "아직 괜찮아요 :)";
                case Mood.Worried: return "슬슬 불안해지는데…";
                // 이모지는 넣지 않음: 작은 창은 맑은 고딕으로 그리는데, 이 폰트엔 이모지가 없어서 네모(□)로 나옴
                case Mood.Crying: return "살려줘… 충전기 주세요 ㅠㅠ";
                case Mood.Charging: return "냠냠, 전기 먹는 중!";
                default: return "배터리가 없는 기기예요. 쿨쿨…";
            }
        }

        public string Title()
        {
            return HasBattery ? "배터리 " + Pct + "%" : "배터리 없음";
        }
    }

    // ── 얼굴 그리기: 64×64 좌표계에서 그림 ──
    static class Face
    {
        static readonly Color Ink = Color.FromArgb(43, 34, 48);
        static readonly Color Tear = Color.FromArgb(47, 124, 246);
        static readonly Color Cheek = Color.FromArgb(150, 255, 120, 140);

        static Color Skin(Mood m)
        {
            switch (m)
            {
                case Mood.Happy: return Color.FromArgb(255, 210, 63);
                case Mood.Smile: return Color.FromArgb(255, 222, 110);
                case Mood.Worried: return Color.FromArgb(255, 190, 120);
                case Mood.Crying: return Color.FromArgb(255, 233, 168);
                case Mood.Charging: return Color.FromArgb(150, 225, 120);
                default: return Color.FromArgb(205, 208, 214);
            }
        }

        // frame: 우는 얼굴의 눈물 위치 (0,1,2 반복) — 0.6초마다 바뀌어 눈물이 흘러내리는 것처럼 보임
        public static void Paint(Graphics g, Mood m, int frame)
        {
            using (Pen pen = new Pen(Ink, 4.5f) { StartCap = LineCap.Round, EndCap = LineCap.Round, LineJoin = LineJoin.Round })
            using (SolidBrush ink = new SolidBrush(Ink))
            using (SolidBrush skin = new SolidBrush(Skin(m)))
            using (SolidBrush cheek = new SolidBrush(Cheek))
            {
                g.FillEllipse(skin, 4, 4, 56, 56);
                g.DrawEllipse(pen, 4, 4, 56, 56);

                switch (m)
                {
                    case Mood.Happy:
                    case Mood.Charging:
                        g.DrawArc(pen, 14, 22, 13, 12, 180, 180);       // ^ ^ 눈
                        g.DrawArc(pen, 37, 22, 13, 12, 180, 180);
                        g.FillPie(ink, 18, 28, 28, 22, 0, 180);           // 활짝 웃는 입
                        g.FillEllipse(cheek, 8, 34, 11, 7);
                        g.FillEllipse(cheek, 45, 34, 11, 7);
                        break;

                    case Mood.Smile:
                        g.FillEllipse(ink, 19, 21, 8, 11);                 // ● ● 눈
                        g.FillEllipse(ink, 37, 21, 8, 11);
                        g.DrawArc(pen, 21, 30, 22, 16, 20, 140);           // 살짝 웃는 입
                        g.FillEllipse(cheek, 9, 34, 10, 6);
                        g.FillEllipse(cheek, 45, 34, 10, 6);
                        break;

                    case Mood.Worried:
                        g.DrawLine(pen, 15, 19, 26, 15);                   // 걱정 눈썹 (안쪽이 올라감)
                        g.DrawLine(pen, 38, 15, 49, 19);
                        g.FillEllipse(ink, 19, 24, 7, 9);
                        g.FillEllipse(ink, 38, 24, 7, 9);
                        g.DrawArc(pen, 22, 42, 20, 12, 200, 140);          // 시무룩한 입 (∩)
                        break;

                    case Mood.Crying:
                        g.DrawLine(pen, 13, 21, 25, 16);                   // 슬픈 눈썹 (안쪽이 올라감 — 반대로 하면 화난 얼굴)
                        g.DrawLine(pen, 39, 16, 51, 21);
                        g.DrawLine(pen, 14, 27, 27, 27);                   // ㅜ ㅜ 감은 눈
                        g.DrawLine(pen, 37, 27, 50, 27);
                        g.FillEllipse(ink, 24, 37, 16, 14);                // 엉엉 벌린 입
                        using (SolidBrush tear = new SolidBrush(Tear))
                        using (Pen white = new Pen(Color.White, 1.5f))
                        {
                            for (int i = 0; i < 2; i++)                    // 눈물 줄기: 양쪽에 두 방울씩
                            {
                                float y = 30 + ((frame + i) % 3) * 9;
                                foreach (float x in new float[] { 17, 43 })
                                {
                                    g.FillEllipse(tear, x - 3.5f, y, 7, 10);
                                    g.DrawEllipse(white, x - 3.5f, y, 7, 10);
                                }
                            }
                        }
                        break;

                    default:  // 배터리 없음: 졸린 얼굴
                        g.DrawLine(pen, 16, 27, 27, 27);
                        g.DrawLine(pen, 37, 27, 48, 27);
                        g.DrawLine(pen, 25, 44, 39, 44);
                        break;
                }

                if (m == Mood.Charging)  // 오른쪽 아래 번개 배지
                {
                    PointF[] bolt = {
                        new PointF(48, 34), new PointF(38, 50), new PointF(46, 50),
                        new PointF(42, 62), new PointF(56, 44), new PointF(48, 44), new PointF(54, 34)
                    };
                    using (SolidBrush yellow = new SolidBrush(Color.FromArgb(255, 214, 10)))
                    using (Pen thin = new Pen(Ink, 2.5f) { LineJoin = LineJoin.Round })
                    {
                        g.FillPolygon(yellow, bolt);
                        g.DrawPolygon(thin, bolt);
                    }
                }
            }
        }

        // 원하는 크기의 이미지로. 작은 아이콘은 4배로 크게 그린 다음 줄여야 선이 깨끗함
        public static Bitmap Render(Mood m, int size, int frame)
        {
            int big = Math.Max(size, 64) * (size < 64 ? 4 : 1);
            Bitmap src = new Bitmap(big, big, PixelFormat.Format32bppArgb);
            using (Graphics g = Graphics.FromImage(src))
            {
                g.SmoothingMode = SmoothingMode.AntiAlias;
                g.ScaleTransform(big / 64f, big / 64f);
                Paint(g, m, frame);
            }
            if (big == size) return src;

            Bitmap dst = new Bitmap(size, size, PixelFormat.Format32bppArgb);
            using (Graphics g = Graphics.FromImage(dst))
            {
                g.InterpolationMode = InterpolationMode.HighQualityBicubic;
                g.PixelOffsetMode = PixelOffsetMode.HighQuality;
                g.DrawImage(src, 0, 0, size, size);
            }
            src.Dispose();
            return dst;
        }
    }

    // ── 아이콘 클릭하면 뜨는 작은 창: 큰 얼굴 + 퍼센트 + 한마디 ──
    class Popup : Form
    {
        Status st;
        int frame;
        readonly float scale;

        public Popup()
        {
            FormBorderStyle = FormBorderStyle.None;
            ShowInTaskbar = false;
            TopMost = true;
            StartPosition = FormStartPosition.Manual;
            BackColor = Color.White;
            DoubleBuffered = true;
            using (Graphics g = CreateGraphics()) scale = g.DpiX / 96f;   // 화면 배율(125%, 150%…)에 맞춰 키움
            Size = new Size((int)(220 * scale), (int)(250 * scale));
            Deactivate += delegate { Hide(); };   // 다른 데 클릭하면 닫힘
            Click += delegate { Hide(); };
        }

        public void Set(Status s, int f)
        {
            st = s;
            frame = f;
            if (Visible) Invalidate();
        }

        public void Toggle()
        {
            if (Visible) { Hide(); return; }
            Rectangle wa = Screen.PrimaryScreen.WorkingArea;   // 작업 표시줄 뺀 영역 → 오른쪽 아래 시계 위에 뜸
            Location = new Point(wa.Right - Width - (int)(12 * scale), wa.Bottom - Height - (int)(12 * scale));
            Show();
            Activate();
        }

        protected override void OnPaint(PaintEventArgs e)
        {
            if (st == null) return;
            Graphics g = e.Graphics;
            g.SmoothingMode = SmoothingMode.AntiAlias;
            g.TextRenderingHint = TextRenderingHint.AntiAliasGridFit;
            g.ScaleTransform(scale, scale);   // 아래는 전부 220×250 기준 좌표

            Color ink = Color.FromArgb(43, 34, 48);
            using (Pen border = new Pen(ink, 2)) g.DrawRectangle(border, 1, 1, 217, 247);

            GraphicsState save = g.Save();
            g.TranslateTransform(46, 14);
            g.ScaleTransform(2, 2);           // 64 → 128px 얼굴
            Face.Paint(g, st.Mood, frame);
            g.Restore(save);

            StringFormat center = new StringFormat { Alignment = StringAlignment.Center };
            using (Font big = new Font("Malgun Gothic", 20, FontStyle.Bold))
            using (Font small = new Font("Malgun Gothic", 10))
            using (SolidBrush inkB = new SolidBrush(ink))
            using (SolidBrush muted = new SolidBrush(Color.FromArgb(110, 104, 115)))
            {
                g.DrawString(st.Title(), big, inkB, new RectangleF(0, 146, 220, 40), center);

                // 배터리 막대: 20% 아래면 빨강
                g.FillRectangle(new SolidBrush(Color.FromArgb(238, 234, 240)), 30, 190, 160, 12);
                Color fill = !st.HasBattery ? Color.Silver
                    : st.Charging ? Color.FromArgb(90, 190, 70)
                    : st.Pct < Status.LOW ? Color.FromArgb(232, 80, 63)
                    : Color.FromArgb(58, 99, 232);
                using (SolidBrush fb = new SolidBrush(fill)) g.FillRectangle(fb, 30, 190, 160 * st.Pct / 100f, 12);
                using (Pen bp = new Pen(ink, 2)) g.DrawRectangle(bp, 30, 190, 160, 12);

                g.DrawString(st.Line(), small, muted, new RectangleF(8, 210, 204, 36), center);
            }
        }
    }

    // ── "윈도우 시작할 때 같이 켜기": 레지스트리 시작 프로그램 목록(내 계정 전용)에 등록 ──
    static class Startup
    {
        const string Key = @"Software\Microsoft\Windows\CurrentVersion\Run";
        const string Name = "BatteryBuddy";

        public static bool IsOn()
        {
            using (RegistryKey k = Registry.CurrentUser.OpenSubKey(Key))
                return k != null && k.GetValue(Name) != null;
        }

        public static void Set(bool on)
        {
            using (RegistryKey k = Registry.CurrentUser.CreateSubKey(Key))
            {
                if (on) k.SetValue(Name, "\"" + Application.ExecutablePath + "\"");
                else k.DeleteValue(Name, false);
            }
        }
    }

    // ── 트레이 앱 본체 ──
    class BuddyApp : ApplicationContext
    {
        [DllImport("user32.dll")] static extern bool DestroyIcon(IntPtr h);

        readonly NotifyIcon tray;
        readonly Popup popup = new Popup();
        readonly System.Windows.Forms.Timer timer = new System.Windows.Forms.Timer();
        readonly ToolStripMenuItem statusItem;
        readonly int forcePct;
        readonly bool forceCharging;

        IntPtr iconHandle = IntPtr.Zero;
        Mood lastMood = (Mood)(-1);
        int lastPct = -1;
        int frame;
        bool warned;   // "충전기 주세요" 알림은 20% 아래로 내려갈 때 한 번만

        public BuddyApp(int forcePct, bool forceCharging)
        {
            this.forcePct = forcePct;
            this.forceCharging = forceCharging;

            ContextMenuStrip menu = new ContextMenuStrip();
            statusItem = new ToolStripMenuItem("") { Enabled = false };
            ToolStripMenuItem startupItem = new ToolStripMenuItem("윈도우 시작할 때 같이 켜기") { Checked = Startup.IsOn() };
            startupItem.Click += delegate
            {
                Startup.Set(!startupItem.Checked);
                startupItem.Checked = Startup.IsOn();
            };
            menu.Items.Add(statusItem);
            menu.Items.Add(new ToolStripSeparator());
            menu.Items.Add(startupItem);
            menu.Items.Add("종료", null, delegate { ExitThread(); });

            tray = new NotifyIcon { ContextMenuStrip = menu, Visible = true };
            tray.MouseClick += (s, e) => { if (e.Button == MouseButtons.Left) popup.Toggle(); };

            timer.Interval = 600;   // 0.6초마다 확인 (우는 중이면 눈물 애니메이션 한 칸씩)
            timer.Tick += delegate { Update(); };
            timer.Start();
            SystemEvents.PowerModeChanged += OnPower;   // 충전기 꽂고 뽑으면 바로 반영
            Update();
        }

        void OnPower(object sender, PowerModeChangedEventArgs e) { Update(); }

        void Update()
        {
            Status s = Status.Read(forcePct, forceCharging);
            bool animate = s.Mood == Mood.Crying;
            if (animate) frame = (frame + 1) % 3;

            // 아이콘은 표정·퍼센트가 바뀌었거나 우는 중(애니메이션)일 때만 다시 그림
            if (animate || s.Mood != lastMood || s.Pct != lastPct)
            {
                SetIcon(s.Mood);
                string tip = s.Title() + " · " + s.Line();
                tray.Text = tip.Length > 63 ? tip.Substring(0, 63) : tip;   // 트레이 툴팁은 63자 제한
                statusItem.Text = s.Title() + " — " + s.Line();
                lastMood = s.Mood;
                lastPct = s.Pct;
            }
            popup.Set(s, frame);

            if (s.Mood == Mood.Crying && !warned)
            {
                warned = true;
                tray.ShowBalloonTip(6000, "배터리 친구가 울고 있어요 😭",
                    "배터리 " + s.Pct + "% 남았어요. 충전기 주세요…", ToolTipIcon.Warning);
            }
            if (s.Charging || s.Pct >= Status.LOW + 5) warned = false;   // 충전하거나 25% 넘으면 다시 알릴 수 있게
        }

        void SetIcon(Mood m)
        {
            int size = SystemInformation.SmallIconSize.Width;   // 화면 배율에 맞는 트레이 아이콘 크기 (16, 20, 24, 32…)
            using (Bitmap b = Face.Render(m, size, frame))
            {
                IntPtr h = b.GetHicon();
                tray.Icon = Icon.FromHandle(h);
                if (iconHandle != IntPtr.Zero) DestroyIcon(iconHandle);   // 예전 아이콘 메모리 정리
                iconHandle = h;
            }
        }

        protected override void ExitThreadCore()
        {
            SystemEvents.PowerModeChanged -= OnPower;
            timer.Stop();
            tray.Visible = false;   // 안 하면 종료 후에도 마우스 올릴 때까지 아이콘이 남아 있음
            tray.Dispose();
            if (iconHandle != IntPtr.Zero) DestroyIcon(iconHandle);
            base.ExitThreadCore();
        }
    }

    static class Program
    {
        [DllImport("user32.dll")] static extern bool SetProcessDPIAware();

        static readonly Mood[] All = { Mood.Happy, Mood.Smile, Mood.Worried, Mood.Crying, Mood.Charging, Mood.NoBattery };

        [STAThread]
        static int Main(string[] args)
        {
            int forcePct = -1;
            bool forceCharging = false;
            for (int i = 0; i < args.Length; i++)
            {
                if (args[i] == "--pct" && i + 1 < args.Length) forcePct = Math.Max(0, Math.Min(100, int.Parse(args[++i])));
                else if (args[i] == "--charging") forceCharging = true;
                else if (args[i] == "--preview" && i + 1 < args.Length) { SavePreview(args[++i]); return 0; }
                else if (args[i] == "--make-ico" && i + 1 < args.Length) { SaveIco(args[++i]); return 0; }
            }

            SetProcessDPIAware();   // 고해상도 화면에서 아이콘이 흐릿하게 늘어나지 않게

            // 두 번 실행해도 트레이에 하나만
            bool first;
            using (Mutex mutex = new Mutex(true, "hachan-lab.BatteryBuddy", out first))
            {
                if (!first) return 0;
                Application.EnableVisualStyles();
                Application.SetCompatibleTextRenderingDefault(false);
                Application.Run(new BuddyApp(forcePct, forceCharging));
            }
            return 0;
        }

        // 표정 6개를 가로로: 윗줄은 크게(96px), 아랫줄은 실제 트레이 크기(16·32px)
        static void SavePreview(string path)
        {
            int cell = 112;
            using (Bitmap sheet = new Bitmap(cell * All.Length, 170))
            using (Graphics g = Graphics.FromImage(sheet))
            {
                g.Clear(Color.White);
                for (int i = 0; i < All.Length; i++)
                {
                    using (Bitmap b = Face.Render(All[i], 96, 1)) g.DrawImage(b, i * cell + 8, 8);
                    using (Bitmap b = Face.Render(All[i], 32, 1)) g.DrawImage(b, i * cell + 20, 120);
                    using (Bitmap b = Face.Render(All[i], 16, 1)) g.DrawImage(b, i * cell + 70, 128);
                }
                sheet.Save(path, ImageFormat.Png);
            }
        }

        // .ico 파일: 여러 크기의 PNG를 한 파일에 담는 형식 (헤더 6바이트 + 크기별 16바이트 목록 + PNG들)
        static void SaveIco(string path)
        {
            int[] sizes = { 16, 24, 32, 48, 64, 128, 256 };
            List<byte[]> pngs = new List<byte[]>();
            foreach (int s in sizes)
                using (Bitmap b = Face.Render(Mood.Happy, s, 0))
                using (MemoryStream ms = new MemoryStream())
                {
                    b.Save(ms, ImageFormat.Png);
                    pngs.Add(ms.ToArray());
                }

            using (BinaryWriter w = new BinaryWriter(File.Create(path)))
            {
                w.Write((short)0); w.Write((short)1); w.Write((short)sizes.Length);
                int offset = 6 + 16 * sizes.Length;
                for (int i = 0; i < sizes.Length; i++)
                {
                    byte d = (byte)(sizes[i] >= 256 ? 0 : sizes[i]);   // 256은 0으로 적는 규칙
                    w.Write(d); w.Write(d); w.Write((byte)0); w.Write((byte)0);
                    w.Write((short)1); w.Write((short)32);
                    w.Write(pngs[i].Length); w.Write(offset);
                    offset += pngs[i].Length;
                }
                foreach (byte[] p in pngs) w.Write(p);
            }
        }
    }
}
