using System;
using System.Collections.Generic;
using System.Drawing;
using System.Drawing.Drawing2D;
using System.Drawing.Printing;
using System.Globalization;
using System.IO;
using System.Linq;
using System.Text;
using System.Windows.Forms;

namespace TilesBilling
{
    // ===================== MODELS =====================
    class Product
    {
        public int Id; public string Code = "", Category = "", Name = ""; public bool IsTile = true;
        public decimal W, H, Scm, SftPack, QtyPack, Rate, Price;
    }
    class Customer
    {
        public int Id; public string Name = "", Address = "", Phone = "", Deal = ""; public decimal OpenDue;
    }
    class Item
    {
        public int ProductId; public string Name = "", Dim = ""; public decimal Box, Piece, Sft, Unit, Total; public bool IsTile = true;
    }
    class Payment
    {
        public int Id; public DateTime Date; public int CustId; public string CustName = ""; public decimal Amount; public string Remark = "", Method = "Cash";
    }
    class Invoice
    {
        public long No; public DateTime Date; public int CustId;
        public string CustName = "", Address = "", Phone = "", Deal = "", Comment = "";
        public decimal Labor, Discount, PrevDue, Cash, Bank, Bkash;
        public decimal Paid { get { return Cash + Bank + Bkash; } }
        public List<Item> Items = new List<Item>();
        public decimal LineSum { get { return Items.Sum(i => i.Total); } }
        public decimal Sub1 { get { return LineSum + Labor; } }
        public decimal Sub2 { get { return Sub1 - Discount; } }
        public decimal Net { get { return Sub2 + PrevDue; } }
        public decimal Due { get { return Net - Paid; } }
    }

    class Txn
    {
        public int Id; public DateTime Date; public bool IsIncome; public string Head = ""; public decimal Amount;
    }

    // ===================== UTIL =====================
    static class Util
    {
        public static decimal Num(string s)
        {
            if (s == null) return 0;
            StringBuilder sb = new StringBuilder();
            foreach (char c in s)
            {
                if (c >= '\u09E6' && c <= '\u09EF') sb.Append((char)('0' + (c - '\u09E6')));
                else if (c != ',' && c != ' ') sb.Append(c);
            }
            decimal d;
            if (decimal.TryParse(sb.ToString(), NumberStyles.Any, CultureInfo.InvariantCulture, out d)) return d;
            return 0;
        }
        public static string M(decimal d) { return d.ToString("N2", CultureInfo.InvariantCulture); }
        public static string Q(decimal d) { return d.ToString("0.##", CultureInfo.InvariantCulture); }
        public static string Q4(decimal d) { return d.ToString("0.####", CultureInfo.InvariantCulture); }

        static readonly string[] Ones = { "", "ONE", "TWO", "THREE", "FOUR", "FIVE", "SIX", "SEVEN", "EIGHT", "NINE", "TEN", "ELEVEN", "TWELVE", "THIRTEEN", "FOURTEEN", "FIFTEEN", "SIXTEEN", "SEVENTEEN", "EIGHTEEN", "NINETEEN" };
        static readonly string[] Tens = { "", "", "TWENTY", "THIRTY", "FORTY", "FIFTY", "SIXTY", "SEVENTY", "EIGHTY", "NINETY" };
        static string B100(int n) { if (n < 20) return Ones[n]; return (Tens[n / 10] + " " + Ones[n % 10]).Trim(); }
        static string B1000(int n)
        {
            string s = "";
            if (n >= 100) s = Ones[n / 100] + " HUNDRED";
            if (n % 100 > 0) s += (s.Length > 0 ? " " : "") + B100(n % 100);
            return s;
        }
        public static string Words(long n)
        {
            if (n == 0) return "ZERO";
            if (n < 0) return "MINUS " + Words(-n);
            string s = "";
            long cr = n / 10000000; n %= 10000000;
            long lk = n / 100000; n %= 100000;
            long th = n / 1000; n %= 1000;
            if (cr > 0) s += Words(cr) + " CRORE ";
            if (lk > 0) s += B100((int)lk) + " LAKH ";
            if (th > 0) s += B100((int)th) + " THOUSAND ";
            if (n > 0) s += B1000((int)n);
            return s.Trim();
        }
        public static string InWords(decimal amt)
        {
            amt = Math.Round(amt, 2);
            decimal a = Math.Abs(amt);
            long whole = (long)Math.Floor(a);
            int paisa = (int)Math.Round((a - whole) * 100);
            string s = Words(whole);
            if (paisa > 0) s += " AND " + Words(paisa) + " PAISA";
            if (amt < 0) s = "MINUS " + s;
            return s + " ONLY";
        }
    }

    // ===================== DATA =====================
    static class Db
    {
        public static string Dir;
        public static List<Product> Products = new List<Product>();
        public static List<Customer> Customers = new List<Customer>();
        public static List<Invoice> Invoices = new List<Invoice>();
        public static List<Payment> Payments = new List<Payment>();
        public static List<Txn> Txns = new List<Txn>();
        // 0 name, 1 address, 2 phones, 3 web, 4 note, 5 prepared by, 6 start invoice no
        public static string[] Shop = new string[8];
        static readonly CultureInfo Inv = CultureInfo.InvariantCulture;
        static readonly string Cfg = Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.ApplicationData), "TilesBilling.cfg");
        const string DT = "yyyy-MM-dd HH:mm:ss";

        public static void Init()
        {
            string d = "";
            try { if (File.Exists(Cfg)) d = File.ReadAllText(Cfg, Encoding.UTF8).Trim(); } catch { }
            if (d.Length == 0) d = Directory.Exists(@"D:\") ? @"D:\TilesBillingData" : @"C:\TilesBillingData";
            SetDir(d);
        }

        public static void SetDir(string d)
        {
            try { Directory.CreateDirectory(d); }
            catch
            {
                d = Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.MyDocuments), "TilesBillingData");
                Directory.CreateDirectory(d);
            }
            Dir = d;
            try { File.WriteAllText(Cfg, d, Encoding.UTF8); } catch { }
            LoadAll();
        }

        public static string P(string f) { return Path.Combine(Dir, f); }
        static string Cl(string s)
        {
            if (s == null) return "";
            return s.Replace("\t", " ").Replace("\r", " ").Replace("\n", " ").Replace("|", " ").Replace("~", " ").Trim();
        }
        static string N(decimal d) { return d.ToString(Inv); }
        static decimal D(string s) { decimal r; decimal.TryParse(s, NumberStyles.Any, Inv, out r); return r; }
        static string[] Rd(string f) { string p = P(f); return File.Exists(p) ? File.ReadAllLines(p, Encoding.UTF8) : new string[0]; }
        static void Wr(string f, List<string> lines)
        {
            string p = P(f), t = p + ".tmp";
            File.WriteAllLines(t, lines.ToArray(), Encoding.UTF8);
            File.Copy(t, p, true);
            File.Delete(t);
        }

        static void LoadAll()
        {
            Shop = new string[] { "আপনার দোকানের নাম", "ঠিকানা", "ফোন নম্বর", "Web / Email", "বিশেষ দ্রষ্টব্য : ভেজা, সিমেন্ট লাগানো, চায়না টাইলস এবং ২ মাসের অতিরিক্ত সময় হলে যে কোন টাইলস ফেরৎ যোগ্য নই।\r\nসাপ্তাহিক বন্ধ : শুক্রবার", "", "", "" };
            string[] sl = Rd("shop.txt");
            for (int i = 0; i < 8 && i < sl.Length; i++) Shop[i] = sl[i].Replace("\\n", "\r\n");

            Products.Clear(); Customers.Clear(); Invoices.Clear(); Payments.Clear(); Txns.Clear();
            foreach (string line in Rd("products.tsv"))
            {
                try
                {
                    string[] p = line.Split('\t'); if (p.Length < 12) continue;
                    Product x = new Product();
                    x.Id = int.Parse(p[0]); x.Code = p[1]; x.Category = p[2]; x.Name = p[3]; x.IsTile = p[4] == "1";
                    x.W = D(p[5]); x.H = D(p[6]); x.Scm = D(p[7]); x.SftPack = D(p[8]); x.QtyPack = D(p[9]); x.Rate = D(p[10]); x.Price = D(p[11]);
                    Products.Add(x);
                }
                catch { }
            }
            foreach (string line in Rd("customers.tsv"))
            {
                try
                {
                    string[] p = line.Split('\t'); if (p.Length < 6) continue;
                    Customer c = new Customer();
                    c.Id = int.Parse(p[0]); c.Name = p[1]; c.Address = p[2]; c.Phone = p[3]; c.Deal = p[4]; c.OpenDue = D(p[5]);
                    Customers.Add(c);
                }
                catch { }
            }
            foreach (string line in Rd("payments.tsv"))
            {
                try
                {
                    string[] p = line.Split('\t'); if (p.Length < 6) continue;
                    Payment x = new Payment();
                    x.Id = int.Parse(p[0]); x.Date = DateTime.ParseExact(p[1], DT, Inv); x.CustId = int.Parse(p[2]);
                    x.CustName = p[3]; x.Amount = D(p[4]); x.Remark = p[5];
                    if (p.Length > 6 && p[6].Length > 0) x.Method = p[6];
                    Payments.Add(x);
                }
                catch { }
            }
            foreach (string line in Rd("txns.tsv"))
            {
                try
                {
                    string[] p = line.Split('\t'); if (p.Length < 5) continue;
                    Txn x = new Txn();
                    x.Id = int.Parse(p[0]); x.Date = DateTime.ParseExact(p[1], DT, Inv); x.IsIncome = p[2] == "1"; x.Head = p[3]; x.Amount = D(p[4]);
                    Txns.Add(x);
                }
                catch { }
            }
            foreach (string line in Rd("invoices.tsv"))
            {
                try
                {
                    string[] p = line.Split('\t'); if (p.Length < 13) continue;
                    Invoice v = new Invoice();
                    v.No = long.Parse(p[0]); v.Date = DateTime.ParseExact(p[1], DT, Inv); v.CustId = int.Parse(p[2]);
                    v.CustName = p[3]; v.Address = p[4]; v.Phone = p[5]; v.Deal = p[6];
                    v.Labor = D(p[7]); v.Discount = D(p[8]); v.PrevDue = D(p[9]); v.Cash = D(p[10]); v.Comment = p[11];
                    if (p.Length > 13) v.Bank = D(p[13]);
                    if (p.Length > 14) v.Bkash = D(p[14]);
                    if (p[12].Length > 0)
                    {
                        foreach (string it in p[12].Split('|'))
                        {
                            string[] f = it.Split('~'); if (f.Length < 9) continue;
                            Item m = new Item();
                            m.ProductId = int.Parse(f[0]); m.Name = f[1]; m.Dim = f[2]; m.Box = D(f[3]); m.Piece = D(f[4]);
                            m.Sft = D(f[5]); m.Unit = D(f[6]); m.Total = D(f[7]); m.IsTile = f[8] == "1";
                            v.Items.Add(m);
                        }
                    }
                    Invoices.Add(v);
                }
                catch { }
            }
        }

        public static void SaveShop()
        {
            List<string> l = new List<string>();
            foreach (string s in Shop) l.Add((s ?? "").Replace("\t", " ").Replace("\r\n", "\\n").Replace("\n", "\\n").Replace("\r", " ").Trim());
            Wr("shop.txt", l);
        }
        public static void SaveProducts()
        {
            List<string> l = new List<string>();
            foreach (Product x in Products)
                l.Add(string.Join("\t", new string[] { x.Id.ToString(), Cl(x.Code), Cl(x.Category), Cl(x.Name), x.IsTile ? "1" : "0", N(x.W), N(x.H), N(x.Scm), N(x.SftPack), N(x.QtyPack), N(x.Rate), N(x.Price) }));
            Wr("products.tsv", l);
        }
        public static void SaveCustomers()
        {
            List<string> l = new List<string>();
            foreach (Customer c in Customers)
                l.Add(string.Join("\t", new string[] { c.Id.ToString(), Cl(c.Name), Cl(c.Address), Cl(c.Phone), Cl(c.Deal), N(c.OpenDue) }));
            Wr("customers.tsv", l);
        }
        public static void SavePayments()
        {
            List<string> l = new List<string>();
            foreach (Payment x in Payments)
                l.Add(string.Join("\t", new string[] { x.Id.ToString(), x.Date.ToString(DT, Inv), x.CustId.ToString(), Cl(x.CustName), N(x.Amount), Cl(x.Remark), Cl(x.Method) }));
            Wr("payments.tsv", l);
        }
        public static void SaveInvoices()
        {
            List<string> l = new List<string>();
            foreach (Invoice v in Invoices)
            {
                string items = string.Join("|", v.Items.Select(m => m.ProductId + "~" + Cl(m.Name) + "~" + Cl(m.Dim) + "~" + N(m.Box) + "~" + N(m.Piece) + "~" + N(m.Sft) + "~" + N(m.Unit) + "~" + N(m.Total) + "~" + (m.IsTile ? "1" : "0")).ToArray());
                l.Add(string.Join("\t", new string[] { v.No.ToString(), v.Date.ToString(DT, Inv), v.CustId.ToString(), Cl(v.CustName), Cl(v.Address), Cl(v.Phone), Cl(v.Deal), N(v.Labor), N(v.Discount), N(v.PrevDue), N(v.Cash), Cl(v.Comment), items, N(v.Bank), N(v.Bkash) }));
            }
            Wr("invoices.tsv", l);
        }

        public static void SaveTxns()
        {
            List<string> l = new List<string>();
            foreach (Txn x in Txns)
                l.Add(string.Join("\t", new string[] { x.Id.ToString(), x.Date.ToString(DT, Inv), x.IsIncome ? "1" : "0", Cl(x.Head), N(x.Amount) }));
            Wr("txns.tsv", l);
        }
        public static int NextTxnId() { return Txns.Count == 0 ? 1 : Txns.Max(x => x.Id) + 1; }
        public static int NextProductId() { return Products.Count == 0 ? 3010001 : Products.Max(x => x.Id) + 1; }
        public static int NextCustId() { return Customers.Count == 0 ? 4000001 : Customers.Max(x => x.Id) + 1; }
        public static int NextPayId() { return Payments.Count == 0 ? 1 : Payments.Max(x => x.Id) + 1; }
        public static long NextInvoiceNo()
        {
            if (Invoices.Count > 0) return Invoices.Max(x => x.No) + 1;
            long s;
            if (long.TryParse(Shop[6], out s) && s > 0) return s;
            return (DateTime.Now.Year % 100) * 100000L + 1;
        }
        public static decimal Balance(int custId)
        {
            Customer c = Customers.FirstOrDefault(x => x.Id == custId);
            decimal b = c == null ? 0 : c.OpenDue;
            foreach (Invoice v in Invoices) if (v.CustId == custId) b += v.Sub2 - v.Paid;
            foreach (Payment p in Payments) if (p.CustId == custId) b -= p.Amount;
            return b;
        }
    }

    // ===================== UI HELPERS =====================
    static class UI
    {
        public static Label L(Control p, string t, int x, int y, int w)
        {
            Label l = new Label(); l.Text = t; l.SetBounds(x, y, w, 24); l.TextAlign = ContentAlignment.MiddleRight; p.Controls.Add(l); return l;
        }
        public static TextBox T(Control p, int x, int y, int w, bool ro)
        {
            TextBox t = new TextBox(); t.SetBounds(x, y, w, 26); t.ReadOnly = ro;
            if (ro) t.BackColor = Color.FromArgb(235, 235, 235);
            p.Controls.Add(t); return t;
        }
        public static Button B(Control p, string t, int x, int y, int w, int h, EventHandler eh)
        {
            Button b = new Button(); b.Text = t; b.SetBounds(x, y, w, h); b.Click += eh; p.Controls.Add(b); return b;
        }
        public static DataGridView G(Control p, int x, int y, int w, int h)
        {
            DataGridView g = new DataGridView(); g.SetBounds(x, y, w, h);
            g.ReadOnly = true; g.AllowUserToAddRows = false; g.AllowUserToDeleteRows = false; g.RowHeadersVisible = false;
            g.SelectionMode = DataGridViewSelectionMode.FullRowSelect; g.MultiSelect = false; g.BackgroundColor = Color.White;
            g.AlternatingRowsDefaultCellStyle.BackColor = Color.FromArgb(225, 225, 250);
            g.AllowUserToResizeRows = false;
            p.Controls.Add(g); return g;
        }
        public static void Col(DataGridView g, string h, int w, bool right)
        {
            int i = g.Columns.Add("c" + g.Columns.Count, h);
            g.Columns[i].Width = w;
            if (right) g.Columns[i].DefaultCellStyle.Alignment = DataGridViewContentAlignment.MiddleRight;
        }
        public static bool Ask(string msg)
        {
            return MessageBox.Show(msg, "নিশ্চিত করুন", MessageBoxButtons.YesNo, MessageBoxIcon.Question) == DialogResult.Yes;
        }
    }

    // ===================== PRINTING =====================
    class PState { public int Idx; }
    class BoxRow
    {
        public string L, Small; public decimal V; public bool Line, Bold;
        public BoxRow(string l, decimal v, bool line, bool bold, string small) { L = l; V = v; Line = line; Bold = bold; Small = small; }
    }

    static class Printer
    {
        public static void T(Graphics g, string s, Font f, Brush b, float x, float y, float w, float h, StringAlignment al)
        {
            StringFormat sf = new StringFormat();
            sf.Alignment = al; sf.LineAlignment = StringAlignment.Center;
            sf.Trimming = StringTrimming.EllipsisCharacter; sf.FormatFlags = StringFormatFlags.NoWrap;
            g.DrawString(s ?? "", f, b, new RectangleF(x, y, w, h), sf);
            sf.Dispose();
        }

        public static float Header(Graphics g, float x0, float W)
        {
            float y = 30;
            string lp = Db.P("logo.png");
            if (File.Exists(lp))
            {
                try { using (Image im = Image.FromFile(lp)) g.DrawImage(im, x0, y, 80, 80); } catch { }
            }
            using (Font f1 = new Font("Nirmala UI", 20, FontStyle.Bold))
            using (Font f2 = new Font("Nirmala UI", 10.5f))
            {
                T(g, Db.Shop[0], f1, Brushes.Black, x0, y, W, 36, StringAlignment.Center);
                T(g, Db.Shop[1], f2, Brushes.Black, x0, y + 36, W, 22, StringAlignment.Center);
                T(g, Db.Shop[2], f2, Brushes.Black, x0, y + 58, W, 22, StringAlignment.Center);
                T(g, Db.Shop[3], f2, Brushes.Black, x0, y + 80, W, 22, StringAlignment.Center);
            }
            y += 106;
            g.DrawLine(Pens.Black, x0, y, x0 + W, y);
            return y + 6;
        }

        static void Preview(PrintPageEventHandler h) { Preview(h, null); }

        static void Preview(PrintPageEventHandler h, PrintEventHandler begin)
        {
            PrintDocument pd = new PrintDocument();
            if (begin != null) pd.BeginPrint += begin;
            pd.PrintPage += h;
            using (PrintPreviewDialog dlg = new PrintPreviewDialog())
            {
                dlg.Document = pd;
                dlg.WindowState = FormWindowState.Maximized;
                dlg.ShowDialog();
            }
        }

        static GraphicsPath RoundRect(float x, float y, float w, float h, float r)
        {
            GraphicsPath gp = new GraphicsPath(); float d = r * 2;
            gp.AddArc(x, y, d, d, 180, 90); gp.AddArc(x + w - d, y, d, d, 270, 90);
            gp.AddArc(x + w - d, y + h - d, d, d, 0, 90); gp.AddArc(x, y + h - d, d, d, 90, 90);
            gp.CloseFigure(); return gp;
        }

        static string PrevDate(Invoice inv)
        {
            if (inv.PrevDue == 0) return null;
            DateTime best = DateTime.MinValue;
            foreach (Invoice v in Db.Invoices) if (v.CustId == inv.CustId && v.No < inv.No && v.Date > best) best = v.Date;
            foreach (Payment p in Db.Payments) if (p.CustId == inv.CustId && p.Date <= inv.Date && p.Date > best) best = p.Date;
            return best == DateTime.MinValue ? null : best.ToString("dd/MM/yy", CultureInfo.InvariantCulture);
        }

        public static void Show(Invoice inv, bool challan)
        {
            PState st = new PState();
            Preview(delegate(object s, PrintPageEventArgs e) { DrawInvoice(inv, challan, e, st); }, delegate { st.Idx = 0; });
        }

        static void DrawPaid(Graphics g, float x, float y)
        {
            using (Brush gb = new SolidBrush(Color.FromArgb(0, 128, 64)))
            using (Pen wp = new Pen(Color.White, 2))
            using (Font f = new Font("Nirmala UI", 15, FontStyle.Bold))
            using (Font f2 = new Font("Nirmala UI", 7))
            {
                g.FillEllipse(gb, x, y, 84, 84);
                g.DrawEllipse(wp, x + 5, y + 5, 74, 74);
                T(g, "PAID", f, Brushes.White, x, y + 18, 84, 30, StringAlignment.Center);
                T(g, "Thank You", f2, Brushes.White, x, y + 48, 84, 16, StringAlignment.Center);
            }
        }

        static void DrawInvoice(Invoice inv, bool ch, PrintPageEventArgs e, PState st)
        {
            Graphics g = e.Graphics;
            g.SmoothingMode = SmoothingMode.AntiAlias;
            float x0 = 40, W = e.PageBounds.Width - 80, H = e.PageBounds.Height;
            using (Font fb = new Font("Nirmala UI", 10, FontStyle.Bold))
            using (Font fn = new Font("Nirmala UI", 9.5f))
            using (Font fi = new Font("Nirmala UI", 9, FontStyle.Italic))
            using (Font fbig = new Font("Nirmala UI", 26))
            using (Pen pk = new Pen(Color.Black, 1))
            using (Brush teal = new SolidBrush(Color.FromArgb(38, 166, 154)))
            {
                float y = Header(g, x0, W);
                g.DrawString("To", fb, Brushes.Black, x0, y + 4);
                string[] lb = { "Customer", "Address", "Contact No", "Customer Deal" };
                string[] vl = { inv.CustName, inv.Address, inv.Phone, inv.Deal };
                for (int i = 0; i < 4; i++)
                {
                    float yy = y + i * 24;
                    T(g, lb[i] + " : " + vl[i], fn, Brushes.Black, x0 + 35, yy, 370, 22, StringAlignment.Near);
                    g.DrawLine(pk, x0 + 35, yy + 22, x0 + 405, yy + 22);
                }
                float rx = x0 + W - 270;
                g.DrawString(ch ? "CHALLAN" : "INVOICE", fbig, teal, rx, y - 8);
                g.DrawString("Invoice No:   " + inv.No, fb, Brushes.Black, rx, y + 48);
                g.DrawString("Sales Date :  " + inv.Date.ToString("dd/MM/yyyy  hh:mm:ss tt", CultureInfo.InvariantCulture), fn, Brushes.Black, rx, y + 70);
                g.DrawString("Customer id :  " + inv.CustId, fb, Brushes.Black, rx, y + 92);

                float ty0 = y + 122, hh = 44, rh = 24;
                string[] heads; float[] bw; int dn;
                if (ch)
                {
                    heads = new string[] { "SL", "Product Name", "Dimension", "Sft", "Box", "Piece", "Remark", "Remark" };
                    bw = new float[] { 35, 250, 120, 70, 45, 45, 70, 70 }; dn = 4;
                }
                else
                {
                    heads = new string[] { "SL", "Product Name", "Dimension", "Box", "Piece", "Sft", "Unit Price", "Line Total" };
                    bw = new float[] { 35, 235, 110, 45, 45, 70, 80, 100 }; dn = 3;
                }
                float sum = bw.Sum();
                float[] cw = new float[bw.Length], cx = new float[bw.Length];
                float cur = x0;
                for (int i = 0; i < bw.Length; i++) { cw[i] = bw[i] * W / sum; cx[i] = cur; cur += cw[i]; }
                for (int i = 0; i < heads.Length; i++)
                {
                    if (i == dn || i == dn + 1)
                    {
                        g.DrawRectangle(pk, cx[i], ty0 + 22, cw[i], 22);
                        T(g, heads[i], fb, Brushes.Black, cx[i], ty0 + 22, cw[i], 22, StringAlignment.Center);
                    }
                    else
                    {
                        g.DrawRectangle(pk, cx[i], ty0, cw[i], hh);
                        T(g, heads[i], fb, Brushes.Black, cx[i], ty0, cw[i], hh, StringAlignment.Center);
                    }
                }
                g.DrawRectangle(pk, cx[dn], ty0, cw[dn] + cw[dn + 1], 22);
                T(g, "Delivery note", fb, Brushes.Black, cx[dn], ty0, cw[dn] + cw[dn + 1], 22, StringAlignment.Center);

                float yRow = ty0 + hh;
                int remaining = inv.Items.Count - st.Idx;
                float reserve = ch ? 70 : 340;
                int rowsFull = Math.Max(1, (int)Math.Floor((H - 110 - yRow) / rh));
                int rowsLast = (int)Math.Floor((H - 110 - reserve - yRow) / rh);
                bool last = remaining <= rowsLast;
                int n = last ? remaining : Math.Min(remaining, rowsFull);
                for (int k = 0; k < n; k++)
                {
                    Item it = inv.Items[st.Idx + k];
                    string sft = (it.IsTile ? it.Sft : it.Piece).ToString("0.00", CultureInfo.InvariantCulture);
                    string[] vals;
                    if (ch) vals = new string[] { (st.Idx + k + 1).ToString(), it.Name, it.IsTile ? it.Dim : "0.00 X 0.00", sft, Util.Q(it.Box), Util.Q(it.Piece), "", "" };
                    else vals = new string[] { (st.Idx + k + 1).ToString(), it.Name, it.IsTile ? it.Dim : "0.00 X 0.00", Util.Q(it.Box), Util.Q(it.Piece), sft, Util.M(it.Unit), Util.M(it.Total) };
                    float yy = yRow + k * rh;
                    for (int c = 0; c < vals.Length; c++)
                    {
                        g.DrawRectangle(pk, cx[c], yy, cw[c], rh);
                        if (c == 1) T(g, vals[c], fi, Brushes.Black, cx[c] + 3, yy, cw[c] - 6, rh, StringAlignment.Near);
                        else T(g, vals[c], fi, Brushes.Black, cx[c], yy, cw[c], rh, StringAlignment.Center);
                    }
                }
                st.Idx += n;
                float yEnd = yRow + n * rh;

                if (last)
                {
                    if (ch)
                    {
                        decimal ts = inv.Items.Sum(i => i.IsTile ? i.Sft : i.Piece), tb = inv.Items.Sum(i => i.Box), tp = inv.Items.Sum(i => i.Piece);
                        T(g, "Total =", fb, Brushes.Black, cx[0], yEnd, cx[3] - cx[0] - 6, rh, StringAlignment.Far);
                        string[] tv = { ts.ToString("0.00", CultureInfo.InvariantCulture), Util.Q(tb), Util.Q(tp) };
                        for (int i = 0; i < 3; i++)
                        {
                            g.DrawRectangle(pk, cx[3 + i], yEnd, cw[3 + i], rh);
                            T(g, tv[i], fb, Brushes.Black, cx[3 + i], yEnd, cw[3 + i], rh, StringAlignment.Center);
                        }
                    }
                    else
                    {
                        float sy = yEnd + 12;
                        using (GraphicsPath gp = RoundRect(x0, sy, 300, 40, 8)) g.DrawPath(pk, gp);
                        if (inv.Comment.Length > 0) g.DrawString(inv.Comment, fn, Brushes.Black, new RectangleF(x0 + 6, sy + 4, 288, 34));
                        g.DrawString("Inword", fb, Brushes.Black, x0, sy + 52);
                        g.DrawString(Util.InWords(inv.Paid), fn, Brushes.Black, new RectangleF(x0 + 6, sy + 76, 330, 40));
                        g.DrawString(Db.Shop[4], fn, Brushes.Black, new RectangleF(x0, sy + 124, 340, 140));

                        List<BoxRow> br = new List<BoxRow>();
                        br.Add(new BoxRow("Total", inv.LineSum, false, false, null));
                        br.Add(new BoxRow("Labor Cost", inv.Labor, false, false, null));
                        br.Add(new BoxRow("Sub Total", inv.Sub1, true, false, null));
                        br.Add(new BoxRow("Discount", inv.Discount, false, false, null));
                        br.Add(new BoxRow("Sub Total", inv.Sub2, true, false, null));
                        br.Add(new BoxRow("Previous Due", inv.PrevDue, false, false, PrevDate(inv)));
                        br.Add(new BoxRow("Net Payable", inv.Net, true, true, null));
                        string[] pn = { "Cash", "Bank", "Bkash" };
                        decimal[] pa = { inv.Cash, inv.Bank, inv.Bkash };
                        int pc = pa.Count(z => z != 0), pdone = 0;
                        decimal rem = inv.Net;
                        for (int pi = 0; pi < 3; pi++)
                        {
                            if (pa[pi] == 0) continue;
                            br.Add(new BoxRow(pn[pi], pa[pi], false, false, null));
                            rem -= pa[pi]; pdone++;
                            if (pdone < pc) br.Add(new BoxRow("Net Payable", rem, true, true, null));
                        }
                        br.Add(new BoxRow("Due", inv.Due, true, true, null));

                        float bx = x0 + W - 250, bh = 14;
                        foreach (BoxRow b2 in br) bh += 22 + (b2.Small != null ? 12 : 0);
                        using (GraphicsPath gp2 = RoundRect(bx, sy, 250, bh, 16)) g.DrawPath(pk, gp2);
                        Font fs2 = new Font("Nirmala UI", 7.5f);
                        float ry = sy + 7;
                        foreach (BoxRow b2 in br)
                        {
                            if (b2.Small != null) { T(g, b2.Small, fs2, Brushes.Black, bx + 6, ry, 140, 14, StringAlignment.Far); ry += 12; }
                            if (b2.Line) g.DrawLine(pk, bx + 60, ry, bx + 240, ry);
                            Font ff = b2.Bold ? fb : fn;
                            T(g, b2.L + " :", ff, Brushes.Black, bx + 6, ry, 140, 22, StringAlignment.Far);
                            T(g, Util.M(b2.V), ff, Brushes.Black, bx + 150, ry, 94, 22, StringAlignment.Far);
                            ry += 22;
                        }
                        fs2.Dispose();
                        if (inv.Due <= 0 && inv.Net > 0) DrawPaid(g, bx - 100, sy + 70);
                    }
                    float sgy = H - 60;
                    string[] sg = { "Customer Signature", "Prepared by", "Store incharge", "Authorised by" };
                    float cwd = W / 4;
                    using (Pen dot = new Pen(Color.Black, 1))
                    {
                        dot.DashStyle = DashStyle.Dot;
                        for (int i = 0; i < 4; i++)
                        {
                            g.DrawLine(dot, x0 + i * cwd + 10, sgy, x0 + (i + 1) * cwd - 10, sgy);
                            T(g, sg[i], fn, Brushes.Black, x0 + i * cwd, sgy + 2, cwd, 20, StringAlignment.Center);
                        }
                    }
                    T(g, Db.Shop[5], fn, Brushes.Black, x0 + cwd, sgy - 22, cwd, 20, StringAlignment.Center);
                    using (Font fs = new Font("Nirmala UI", 8)) T(g, Db.Shop[7], fs, Brushes.Black, x0, H - 28, W, 18, StringAlignment.Center);
                }
                e.HasMorePages = !last;
            }
        }

        public static void Receipt(Payment p, decimal balAfter)
        {
            Preview(delegate(object s, PrintPageEventArgs e)
            {
                Graphics g = e.Graphics;
                float x0 = 40, W = e.PageBounds.Width - 80;
                using (Font fb = new Font("Nirmala UI", 11, FontStyle.Bold))
                using (Font fn = new Font("Nirmala UI", 11))
                using (Font ft = new Font("Nirmala UI", 18, FontStyle.Bold))
                {
                    float y = Header(g, x0, W);
                    T(g, "MONEY RECEIPT", ft, Brushes.Black, x0, y + 6, W, 40, StringAlignment.Center);
                    y += 60;
                    string[] lb = { "Receipt No", "Date", "Customer", "Received", "Method", "In words", "Remark", "Balance Due" };
                    string[] vl = { p.Id.ToString(), p.Date.ToString("dd/MM/yyyy hh:mm tt", CultureInfo.InvariantCulture), p.CustName, Util.M(p.Amount), p.Method, Util.InWords(p.Amount), p.Remark, Util.M(balAfter) };
                    for (int i = 0; i < lb.Length; i++)
                    {
                        T(g, lb[i] + " :", fb, Brushes.Black, x0, y, 150, 30, StringAlignment.Near);
                        T(g, vl[i], fn, Brushes.Black, x0 + 160, y, W - 160, 30, StringAlignment.Near);
                        y += 34;
                    }
                    y += 80;
                    using (Pen dot = new Pen(Color.Black, 1))
                    {
                        dot.DashStyle = DashStyle.Dot;
                        g.DrawLine(dot, x0, y, x0 + 200, y); g.DrawLine(dot, x0 + W - 200, y, x0 + W, y);
                    }
                    T(g, "Customer Signature", fn, Brushes.Black, x0, y + 2, 200, 24, StringAlignment.Center);
                    T(g, "Authorised by", fn, Brushes.Black, x0 + W - 200, y + 2, 200, 24, StringAlignment.Center);
                }
                e.HasMorePages = false;
            });
        }
    }

    // ===================== CUSTOMER =====================
    class CustomerForm : Form
    {
        TextBox txtName, txtAddr, txtPhone, txtDeal, txtOpen, txtSearch;
        Label lblId;
        DataGridView grid;
        List<Customer> shown = new List<Customer>();
        Customer cur;
        bool pick;
        public Customer Picked;

        public CustomerForm(bool pickMode)
        {
            pick = pickMode;
            Text = pickMode ? "গ্রাহক বাছাই করুন" : "গ্রাহক (Customer)";
            Font = new Font("Nirmala UI", 10);
            ClientSize = new Size(860, 600);
            StartPosition = FormStartPosition.CenterScreen;

            UI.L(this, "ID :", 10, 12, 110); lblId = new Label(); lblId.SetBounds(125, 12, 200, 24); lblId.TextAlign = ContentAlignment.MiddleLeft; Controls.Add(lblId);
            UI.L(this, "নাম :", 10, 42, 110); txtName = UI.T(this, 125, 42, 300, false);
            UI.L(this, "Short Address :", 10, 72, 110); txtAddr = UI.T(this, 125, 72, 300, false);
            UI.L(this, "মোবাইল :", 440, 42, 110); txtPhone = UI.T(this, 555, 42, 200, false);
            UI.L(this, "Deal / Contact :", 440, 72, 110); txtDeal = UI.T(this, 555, 72, 280, false);
            UI.L(this, "পুরাতন বাকি :", 440, 102, 110); txtOpen = UI.T(this, 555, 102, 120, false);

            UI.B(this, "New", 125, 105, 90, 32, delegate { NewEntry(); });
            UI.B(this, "Save", 225, 105, 90, 32, delegate { Save(); });
            UI.B(this, "Delete", 325, 105, 90, 32, delegate { Delete(); });
            if (pick) UI.B(this, "Select", 700, 98, 135, 38, delegate { Choose(); });
            else UI.B(this, "Product List", 700, 98, 135, 38, delegate { if (cur != null) { using (CustomerProductForm f = new CustomerProductForm(cur)) f.ShowDialog(); } else MessageBox.Show("একজন গ্রাহক বাছুন।"); });

            UI.L(this, "Search :", 10, 150, 110); txtSearch = UI.T(this, 125, 150, 300, false);
            txtSearch.TextChanged += delegate { Reload(); };

            grid = UI.G(this, 10, 185, 840, 405);
            UI.Col(grid, "ID", 80, false); UI.Col(grid, "Name", 230, false); UI.Col(grid, "Address", 150, false);
            UI.Col(grid, "Mobile", 110, false); UI.Col(grid, "Deal", 140, false); UI.Col(grid, "Balance", 100, true);
            grid.Anchor = AnchorStyles.Top | AnchorStyles.Bottom | AnchorStyles.Left | AnchorStyles.Right;
            grid.CellClick += delegate { LoadSel(); };
            grid.CellDoubleClick += delegate { LoadSel(); if (pick) Choose(); };
            Reload();
        }

        void Reload()
        {
            string q = txtSearch.Text.Trim().ToLower();
            shown = Db.Customers.Where(c => q.Length == 0 || c.Name.ToLower().Contains(q) || c.Phone.Contains(q) || c.Address.ToLower().Contains(q) || c.Id.ToString() == q).OrderBy(c => c.Name).ToList();
            grid.Rows.Clear();
            foreach (Customer c in shown) grid.Rows.Add(c.Id, c.Name, c.Address, c.Phone, c.Deal, Util.M(Db.Balance(c.Id)));
        }

        void LoadSel()
        {
            if (grid.CurrentRow == null || grid.CurrentRow.Index < 0 || grid.CurrentRow.Index >= shown.Count) return;
            cur = shown[grid.CurrentRow.Index];
            lblId.Text = cur.Id.ToString(); txtName.Text = cur.Name; txtAddr.Text = cur.Address; txtPhone.Text = cur.Phone;
            txtDeal.Text = cur.Deal; txtOpen.Text = Util.Q(cur.OpenDue);
        }

        void NewEntry()
        {
            cur = null; lblId.Text = ""; txtName.Text = ""; txtAddr.Text = ""; txtPhone.Text = ""; txtDeal.Text = ""; txtOpen.Text = "0"; txtName.Focus();
        }

        void Save()
        {
            if (txtName.Text.Trim().Length == 0) { MessageBox.Show("নাম দিন।"); return; }
            bool isNew = cur == null;
            if (isNew) { cur = new Customer(); cur.Id = Db.NextCustId(); Db.Customers.Add(cur); }
            cur.Name = txtName.Text.Trim(); cur.Address = txtAddr.Text.Trim(); cur.Phone = txtPhone.Text.Trim();
            cur.Deal = txtDeal.Text.Trim(); cur.OpenDue = Util.Num(txtOpen.Text);
            Db.SaveCustomers();
            lblId.Text = cur.Id.ToString();
            Reload();
            MessageBox.Show("সংরক্ষিত হয়েছে। ID: " + cur.Id);
        }

        void Delete()
        {
            if (cur == null) return;
            if (Db.Invoices.Any(v => v.CustId == cur.Id) || Db.Payments.Any(p => p.CustId == cur.Id))
            { MessageBox.Show("এই গ্রাহকের বিল/জমা আছে, তাই মুছা যাবে না।"); return; }
            if (!UI.Ask("গ্রাহক '" + cur.Name + "' মুছবেন?")) return;
            Db.Customers.Remove(cur); Db.SaveCustomers(); NewEntry(); Reload();
        }

        void Choose()
        {
            if (cur == null) { MessageBox.Show("একজন গ্রাহক বাছুন।"); return; }
            Picked = cur; DialogResult = DialogResult.OK; Close();
        }
    }

    // ===================== PRODUCT =====================
    class ProductForm : Form
    {
        TextBox txtPid, txtCode, txtName, txtW, txtH, txtScm, txtSft, txtQty, txtRate, txtPrice, txtSearch;
        ComboBox cboCat;
        RadioButton rbTile, rbOther;
        DataGridView grid;
        List<Product> shown = new List<Product>();
        Product cur;
        bool busy;

        public ProductForm()
        {
            Text = "পণ্য (Product Information)";
            Font = new Font("Nirmala UI", 10);
            ClientSize = new Size(940, 680);
            StartPosition = FormStartPosition.CenterScreen;

            Label hd = new Label(); hd.Text = "PRODUCT INFORMATION"; hd.SetBounds(0, 0, 940, 44); hd.BackColor = Color.FromArgb(47, 79, 79);
            hd.ForeColor = Color.White; hd.Font = new Font("Nirmala UI", 18, FontStyle.Bold); hd.TextAlign = ContentAlignment.MiddleCenter; Controls.Add(hd);
            hd.Anchor = AnchorStyles.Top | AnchorStyles.Left | AnchorStyles.Right;

            UI.L(this, "Product Id :", 5, 55, 140); txtPid = UI.T(this, 150, 55, 200, true);
            UI.L(this, "Product Code :", 5, 88, 140); txtCode = UI.T(this, 150, 88, 200, false);
            UI.L(this, "Category :", 5, 121, 140);
            cboCat = new ComboBox(); cboCat.SetBounds(150, 121, 200, 26); cboCat.DropDownStyle = ComboBoxStyle.DropDown; Controls.Add(cboCat);
            UI.L(this, "Product Name :", 5, 154, 140); txtName = UI.T(this, 150, 154, 330, true);
            UI.L(this, "Dimension (inch) :", 5, 187, 140); txtW = UI.T(this, 150, 187, 80, false);
            UI.L(this, "x", 232, 187, 16); txtH = UI.T(this, 250, 187, 80, false);
            rbTile = new RadioButton(); rbTile.Text = "Tiles"; rbTile.Checked = true; rbTile.SetBounds(150, 222, 90, 26); Controls.Add(rbTile);
            rbOther = new RadioButton(); rbOther.Text = "Other (fittings)"; rbOther.SetBounds(250, 222, 150, 26); Controls.Add(rbOther);

            UI.L(this, "SCM Per Pack :", 500, 55, 140); txtScm = UI.T(this, 645, 55, 150, false);
            UI.L(this, "SFT Per Pack :", 500, 88, 140); txtSft = UI.T(this, 645, 88, 150, false);
            UI.L(this, "Qty Per Pack :", 500, 121, 140); txtQty = UI.T(this, 645, 121, 150, false);
            UI.L(this, "Rate / Sft :", 500, 154, 140); txtRate = UI.T(this, 645, 154, 150, false);
            UI.L(this, "Sales Price Sft :", 500, 187, 140); txtPrice = UI.T(this, 645, 187, 150, false);
            Label hint = new Label(); hint.Text = "Other পণ্যের জন্য Sales Price = প্রতি পিসের দাম"; hint.SetBounds(500, 215, 430, 24); Controls.Add(hint);

            UI.B(this, "Save", 150, 262, 130, 38, delegate { Save(); }).BackColor = Color.ForestGreen;
            UI.B(this, "New", 290, 262, 130, 38, delegate { NewEntry(); });
            UI.B(this, "Delete", 430, 262, 130, 38, delegate { Delete(); });

            UI.L(this, "Search :", 5, 315, 140); txtSearch = UI.T(this, 150, 315, 300, false);
            txtSearch.TextChanged += delegate { Reload(); };

            grid = UI.G(this, 10, 350, 920, 320);
            UI.Col(grid, "PID", 90, false); UI.Col(grid, "Product Name", 330, false); UI.Col(grid, "Dimension", 100, false);
            UI.Col(grid, "Sft/Pack", 80, true); UI.Col(grid, "Qty/Pack", 80, true); UI.Col(grid, "Rate", 70, true); UI.Col(grid, "S Price", 70, true);
            grid.Anchor = AnchorStyles.Top | AnchorStyles.Bottom | AnchorStyles.Left | AnchorStyles.Right;
            grid.CellClick += delegate { LoadSel(); };

            EventHandler recalc = delegate { AutoName(); AutoSft(); };
            txtCode.TextChanged += recalc; cboCat.TextChanged += recalc;
            txtW.TextChanged += recalc; txtH.TextChanged += recalc; txtQty.TextChanged += recalc;
            RefreshCats();
            Reload();
        }

        void RefreshCats()
        {
            string t = cboCat.Text;
            cboCat.Items.Clear();
            foreach (string c in Db.Products.Select(pp => pp.Category).Where(cc => cc.Length > 0).Distinct().OrderBy(cc => cc)) cboCat.Items.Add(c);
            cboCat.Text = t;
        }

        void AutoName()
        {
            if (busy) return;
            string c = txtCode.Text.Trim(), k = cboCat.Text.Trim();
            txtName.Text = k.Length > 0 ? c + "-" + k : c;
        }

        void AutoSft()
        {
            if (busy || !rbTile.Checked) return;
            decimal w = Util.Num(txtW.Text), h = Util.Num(txtH.Text), q = Util.Num(txtQty.Text);
            if (w > 0 && h > 0 && q > 0) txtSft.Text = Util.Q4(Math.Round(w * h / 144m * q, 4));
        }

        void Reload()
        {
            string q = txtSearch.Text.Trim().ToLower();
            shown = Db.Products.Where(p => q.Length == 0 || p.Name.ToLower().Contains(q) || p.Id.ToString().Contains(q)).OrderBy(p => p.Name).ToList();
            grid.Rows.Clear();
            foreach (Product p in shown)
                grid.Rows.Add(p.Id, p.Name, p.IsTile ? Util.Q(p.W) + " X " + Util.Q(p.H) : "-", Util.Q4(p.SftPack), Util.Q(p.QtyPack), Util.Q(p.Rate), Util.Q(p.Price));
        }

        void LoadSel()
        {
            if (grid.CurrentRow == null || grid.CurrentRow.Index < 0 || grid.CurrentRow.Index >= shown.Count) return;
            cur = shown[grid.CurrentRow.Index];
            busy = true;
            txtPid.Text = cur.Id.ToString(); txtCode.Text = cur.Code; cboCat.Text = cur.Category; txtName.Text = cur.Name;
            txtW.Text = Util.Q(cur.W); txtH.Text = Util.Q(cur.H); txtScm.Text = Util.Q(cur.Scm); txtSft.Text = Util.Q4(cur.SftPack);
            txtQty.Text = Util.Q(cur.QtyPack); txtRate.Text = Util.Q(cur.Rate); txtPrice.Text = Util.Q(cur.Price);
            rbTile.Checked = cur.IsTile; rbOther.Checked = !cur.IsTile;
            busy = false;
        }

        void NewEntry()
        {
            cur = null; busy = true;
            txtPid.Text = ""; txtCode.Text = ""; cboCat.Text = ""; txtName.Text = ""; txtW.Text = ""; txtH.Text = "";
            txtScm.Text = ""; txtSft.Text = ""; txtQty.Text = ""; txtRate.Text = ""; txtPrice.Text = "";
            busy = false; txtCode.Focus();
        }

        void Save()
        {
            if (txtCode.Text.Trim().Length == 0) { MessageBox.Show("Product Code দিন।"); return; }
            AutoName();
            string nm = txtName.Text.Trim();
            if (Db.Products.Any(p => p != cur && p.Name.ToLower() == nm.ToLower())) { MessageBox.Show("এই নামে পণ্য আগেই আছে।"); return; }
            bool tile = rbTile.Checked;
            if (tile && Util.Num(txtSft.Text) <= 0) { MessageBox.Show("টাইলসের জন্য SFT Per Pack দিন (মাপ ও Qty দিলে নিজে হিসাব হবে)।"); return; }
            if (cur == null) { cur = new Product(); cur.Id = Db.NextProductId(); Db.Products.Add(cur); }
            cur.Code = txtCode.Text.Trim(); cur.Category = cboCat.Text.Trim(); cur.Name = nm; cur.IsTile = tile;
            cur.W = Util.Num(txtW.Text); cur.H = Util.Num(txtH.Text); cur.Scm = Util.Num(txtScm.Text);
            cur.SftPack = Util.Num(txtSft.Text); cur.QtyPack = Util.Num(txtQty.Text);
            cur.Rate = Util.Num(txtRate.Text); cur.Price = Util.Num(txtPrice.Text);
            Db.SaveProducts();
            NewEntry(); RefreshCats(); Reload();
        }

        void Delete()
        {
            if (cur == null) return;
            if (!UI.Ask("পণ্য '" + cur.Name + "' মুছবেন? (পুরাতন বিল অপরিবর্তিত থাকবে)")) return;
            Db.Products.Remove(cur); Db.SaveProducts(); NewEntry(); Reload();
        }
    }

    // ===================== ORDER / INVOICE =====================
    class OrderForm : Form
    {
        Panel pnlLeft, pnlRight;
        TextBox txtNo, txtCid, txtCust, txtAddr, txtPhone, txtDeal, txtComment, txtTotal, txtLabor, txtDisc, txtSub, txtPrev, txtNet, txtCash, txtBank, txtBkash, txtDue, txtSft;
        DateTimePicker dtp;
        CheckBox chkAuto;
        ComboBox cboProd;
        TextBox txtBox, txtPiece, txtISft, txtRate, txtITotal;
        DataGridView grid, glist;
        TextBox txtSearch; DateTimePicker dFrom, dTo; Label lblSum;
        List<Item> lines = new List<Item>();
        List<Invoice> shown = new List<Invoice>();
        Customer selCust; long editingNo; decimal prevDue; bool busy; Product lastProd;

        public OrderForm()
        {
            Text = "Order / Invoice";
            Font = new Font("Nirmala UI", 10);
            WindowState = FormWindowState.Maximized;
            MinimumSize = new Size(1150, 700);

            pnlLeft = new Panel(); pnlLeft.Dock = DockStyle.Left; pnlLeft.Width = 830;
            pnlRight = new Panel(); pnlRight.Dock = DockStyle.Fill;
            Controls.Add(pnlRight); Controls.Add(pnlLeft);
            pnlRight.BringToFront();

            Label hd = new Label(); hd.Text = "INVOICE"; hd.SetBounds(0, 0, 830, 44); hd.BackColor = Color.FromArgb(47, 79, 79);
            hd.ForeColor = Color.White; hd.Font = new Font("Nirmala UI", 18, FontStyle.Bold); hd.TextAlign = ContentAlignment.MiddleCenter;
            pnlLeft.Controls.Add(hd);

            Panel p = pnlLeft;
            UI.L(p, "Invoice/SL :", 5, 60, 105); txtNo = UI.T(p, 115, 60, 235, true);
            UI.L(p, "User Code :", 5, 90, 105); txtCid = UI.T(p, 115, 90, 235, true);
            UI.L(p, "Sales Date :", 5, 120, 105);
            dtp = new DateTimePicker(); dtp.Format = DateTimePickerFormat.Short; dtp.SetBounds(115, 120, 235, 26); p.Controls.Add(dtp);
            UI.L(p, "Customer :", 5, 150, 105); txtCust = UI.T(p, 115, 150, 200, false);
            UI.B(p, "...", 320, 149, 30, 28, delegate { PickCustomer(); });
            UI.L(p, "Short Add :", 5, 180, 105); txtAddr = UI.T(p, 115, 180, 235, false);
            UI.L(p, "Contact No :", 5, 210, 105); txtPhone = UI.T(p, 115, 210, 235, false);
            UI.L(p, "Cust. Deal :", 5, 240, 105); txtDeal = UI.T(p, 115, 240, 235, false);
            UI.L(p, "Comment :", 5, 270, 105); txtComment = UI.T(p, 115, 270, 235, false);
            txtComment.Multiline = true; txtComment.Height = 50;
            UI.L(p, "Total Sft :", 5, 330, 105); txtSft = UI.T(p, 115, 330, 235, true);
            UI.B(p, "Remove selected line", 115, 362, 235, 28, delegate { RemoveLine(); });

            UI.L(p, "Total Amount :", 360, 60, 115); txtTotal = UI.T(p, 480, 60, 140, true);
            UI.L(p, "Labor cost :", 360, 90, 115); txtLabor = UI.T(p, 480, 90, 140, false);
            chkAuto = new CheckBox(); chkAuto.Text = "Auto round 10"; chkAuto.Checked = true; chkAuto.SetBounds(630, 90, 190, 26); p.Controls.Add(chkAuto);
            UI.L(p, "Discount :", 360, 120, 115); txtDisc = UI.T(p, 480, 120, 140, false);
            UI.L(p, "Sub Total :", 360, 150, 115); txtSub = UI.T(p, 480, 150, 140, true);
            UI.L(p, "Previous Due :", 360, 180, 115); txtPrev = UI.T(p, 480, 180, 140, true);
            UI.L(p, "Net Payable :", 360, 210, 115); txtNet = UI.T(p, 480, 210, 140, true);
            UI.L(p, "Cash :", 360, 240, 115); txtCash = UI.T(p, 480, 240, 140, false);
            UI.L(p, "Bank :", 360, 270, 115); txtBank = UI.T(p, 480, 270, 140, false);
            UI.L(p, "Bkash :", 360, 300, 115); txtBkash = UI.T(p, 480, 300, 140, false);
            UI.B(p, "Full", 630, 239, 60, 28, delegate { decimal rest = Util.Num(txtNet.Text) - Util.Num(txtBank.Text) - Util.Num(txtBkash.Text); txtCash.Text = Util.Q(Math.Max(0, rest)); });
            UI.L(p, "Due :", 360, 330, 115); txtDue = UI.T(p, 480, 330, 140, true);
            

            UI.B(p, "New", 5, 405, 110, 36, delegate { NewInvoice(); });
            UI.B(p, "Save", 125, 405, 110, 36, delegate { Save(0); });
            UI.B(p, "Save + Invoice Print", 245, 405, 280, 36, delegate { Save(1); });
            UI.B(p, "Save + Challan Print", 535, 405, 280, 36, delegate { Save(2); });

            string[] ih = { "Product", "Box", "Piece", "Sft", "Rate/Sft", "Total" };
            int[] ix = { 5, 380, 450, 520, 600, 680 }; int[] iw = { 370, 65, 65, 75, 75, 90 };
            for (int i = 0; i < ih.Length; i++)
            {
                Label l = new Label(); l.Text = ih[i]; l.SetBounds(ix[i], 450, iw[i], 22); p.Controls.Add(l);
            }
            cboProd = new ComboBox(); cboProd.SetBounds(5, 474, 370, 26); cboProd.DropDownStyle = ComboBoxStyle.DropDown;
            cboProd.AutoCompleteMode = AutoCompleteMode.SuggestAppend; cboProd.AutoCompleteSource = AutoCompleteSource.ListItems; p.Controls.Add(cboProd);
            txtBox = UI.T(p, 380, 474, 65, false); txtPiece = UI.T(p, 450, 474, 65, false); txtISft = UI.T(p, 520, 474, 75, false);
            txtRate = UI.T(p, 600, 474, 75, false); txtITotal = UI.T(p, 680, 474, 90, true);
            UI.B(p, "Add", 775, 472, 50, 30, delegate { AddItem(); });

            grid = UI.G(p, 5, 510, 820, 200);
            UI.Col(grid, "SL", 35, false); UI.Col(grid, "Product", 270, false); UI.Col(grid, "Dimension", 100, false);
            UI.Col(grid, "Box", 45, true); UI.Col(grid, "Piece", 50, true); UI.Col(grid, "Sft", 65, true); UI.Col(grid, "Rate", 70, true); UI.Col(grid, "Total", 90, true);
            grid.Anchor = AnchorStyles.Top | AnchorStyles.Bottom | AnchorStyles.Left | AnchorStyles.Right;

            // right side
            Panel top = new Panel(); top.Dock = DockStyle.Top; top.Height = 76;
            Panel bot = new Panel(); bot.Dock = DockStyle.Bottom; bot.Height = 92;
            glist = UI.G(pnlRight, 0, 0, 100, 100); glist.Dock = DockStyle.Fill;
            pnlRight.Controls.Add(bot); pnlRight.Controls.Add(top);
            glist.BringToFront();
            UI.L(top, "Search :", 0, 8, 65); txtSearch = UI.T(top, 70, 8, 220, false);
            UI.B(top, "Search", 300, 6, 90, 30, delegate { LoadList(); });
            UI.L(top, "From :", 0, 42, 65);
            dFrom = new DateTimePicker(); dFrom.Format = DateTimePickerFormat.Short; dFrom.SetBounds(70, 42, 130, 26); top.Controls.Add(dFrom);
            UI.L(top, "To :", 205, 42, 40);
            dTo = new DateTimePicker(); dTo.Format = DateTimePickerFormat.Short; dTo.SetBounds(250, 42, 130, 26); top.Controls.Add(dTo);
            UI.Col(glist, "SL", 40, false); UI.Col(glist, "Invoice No", 90, false); UI.Col(glist, "User Name", 170, false);
            UI.Col(glist, "Short Address", 120, false); UI.Col(glist, "Total Amount", 90, true);
            lblSum = new Label(); lblSum.SetBounds(5, 4, 520, 40); bot.Controls.Add(lblSum);
            UI.B(bot, "Load / Edit", 5, 50, 100, 32, delegate { LoadSelected(); });
            UI.B(bot, "Delete", 110, 50, 80, 32, delegate { DeleteSelected(); });
            UI.B(bot, "Invoice", 195, 50, 90, 32, delegate { PrintSelected(false); });
            UI.B(bot, "Challan", 290, 50, 90, 32, delegate { PrintSelected(true); });
            glist.CellDoubleClick += delegate { LoadSelected(); };
            txtSearch.TextChanged += delegate { LoadList(); };
            dFrom.ValueChanged += delegate { LoadList(); };
            dTo.ValueChanged += delegate { LoadList(); };

            // item entry events
            cboProd.TextChanged += delegate { ProdChanged(); };
            cboProd.SelectedIndexChanged += delegate { ProdChanged(); };
            txtBox.TextChanged += delegate { ItemCalc(); };
            txtPiece.TextChanged += delegate { ItemCalc(); };
            txtRate.TextChanged += delegate { ItemCalc(); };
            txtISft.TextChanged += delegate { SftChanged(); };
            txtISft.Leave += delegate { ItemCalc(); };
            txtRate.KeyDown += delegate(object so, KeyEventArgs ke) { if (ke.KeyCode == Keys.Enter) { ke.SuppressKeyPress = true; AddItem(); } };
            txtLabor.TextChanged += delegate { Recalc(); };
            txtDisc.TextChanged += delegate { Recalc(); };
            txtCash.TextChanged += delegate { Recalc(); };
            txtBank.TextChanged += delegate { Recalc(); };
            txtBkash.TextChanged += delegate { Recalc(); };
            chkAuto.CheckedChanged += delegate { txtLabor.ReadOnly = chkAuto.Checked; Recalc(); };
            txtCust.TextChanged += delegate { if (selCust != null && txtCust.Text != selCust.Name) { selCust = null; txtCid.Text = ""; prevDue = 0; Recalc(); } };
            Activated += delegate { RefreshProducts(); };

            RefreshProducts();
            txtLabor.ReadOnly = true;
            NewInvoice();
            LoadList();
        }

        void RefreshProducts()
        {
            string t = cboProd.Text;
            cboProd.Items.Clear();
            foreach (Product x in Db.Products.OrderBy(q => q.Name)) cboProd.Items.Add(x.Name);
            cboProd.Text = t;
        }

        Product FindProd()
        {
            string t = cboProd.Text.Trim().ToLower();
            if (t.Length == 0) return null;
            return Db.Products.FirstOrDefault(x => x.Name.ToLower() == t);
        }

        void ProdChanged()
        {
            Product p = FindProd();
            if (p != lastProd)
            {
                lastProd = p;
                if (p != null) txtRate.Text = Util.Q(p.Price);
            }
            ItemCalc();
        }

        bool inCalc;

        // Box / Piece -> Sft, Total
        void ItemCalc()
        {
            if (inCalc) return;
            inCalc = true;
            Product p = FindProd();
            decimal box = Util.Num(txtBox.Text), piece = Util.Num(txtPiece.Text), rate = Util.Num(txtRate.Text);
            decimal sft = 0, total = 0;
            if (p != null)
            {
                if (p.IsTile)
                {
                    sft = box * p.SftPack + (p.QtyPack > 0 ? piece * p.SftPack / p.QtyPack : 0);
                    sft = Math.Round(sft, 2);
                    total = Math.Round(sft * rate, 2);
                }
                else total = Math.Round(piece * rate, 2);
            }
            txtISft.Text = sft.ToString("0.00", CultureInfo.InvariantCulture);
            txtITotal.Text = total.ToString("0.00", CultureInfo.InvariantCulture);
            inCalc = false;
        }

        // Sft -> Box, Piece, Total (rounded up to whole pieces)
        void SftChanged()
        {
            if (inCalc) return;
            Product p = FindProd();
            if (p == null || !p.IsTile || p.SftPack <= 0 || p.QtyPack <= 0) return;
            inCalc = true;
            decimal sft = Util.Num(txtISft.Text), rate = Util.Num(txtRate.Text);
            decimal perPiece = p.SftPack / p.QtyPack;
            decimal pieces = sft <= 0 ? 0 : Math.Max(0, Math.Ceiling(sft / perPiece - 0.02m));
            decimal box = Math.Floor(pieces / p.QtyPack);
            decimal piece = pieces - box * p.QtyPack;
            txtBox.Text = Util.Q(box);
            txtPiece.Text = Util.Q(piece);
            decimal actual = Math.Round(box * p.SftPack + piece * perPiece, 2);
            txtITotal.Text = Math.Round(actual * rate, 2).ToString("0.00", CultureInfo.InvariantCulture);
            inCalc = false;
        }

        void AddItem()
        {
            Product p = FindProd();
            if (p == null) { MessageBox.Show("তালিকা থেকে সঠিক পণ্য বাছুন।"); return; }
            decimal box = Util.Num(txtBox.Text), piece = Util.Num(txtPiece.Text);
            if (box <= 0 && piece <= 0) { MessageBox.Show("Box বা Piece দিন।"); return; }
            ItemCalc();
            Item it = new Item();
            it.ProductId = p.Id; it.Name = p.Name; it.IsTile = p.IsTile; it.Box = box; it.Piece = piece;
            it.Dim = p.IsTile ? p.W.ToString("0.00", CultureInfo.InvariantCulture) + " X " + p.H.ToString("0.00", CultureInfo.InvariantCulture) : "0.00 X 0.00";
            it.Sft = Util.Num(txtISft.Text); it.Unit = Util.Num(txtRate.Text); it.Total = Util.Num(txtITotal.Text);
            lines.Add(it);
            RefreshGrid();
            cboProd.Text = ""; txtBox.Text = ""; txtPiece.Text = ""; txtRate.Text = ""; lastProd = null;
            cboProd.Focus();
        }

        void RemoveLine()
        {
            if (grid.CurrentRow == null || grid.CurrentRow.Index < 0 || grid.CurrentRow.Index >= lines.Count) return;
            lines.RemoveAt(grid.CurrentRow.Index);
            RefreshGrid();
        }

        void RefreshGrid()
        {
            grid.Rows.Clear();
            int i = 1;
            foreach (Item it in lines)
                grid.Rows.Add(i++, it.Name, it.Dim, Util.Q(it.Box), Util.Q(it.Piece), (it.IsTile ? it.Sft : it.Piece).ToString("0.00", CultureInfo.InvariantCulture), Util.M(it.Unit), Util.M(it.Total));
            Recalc();
        }

        void Recalc()
        {
            if (busy) return;
            busy = true;
            decimal sum = lines.Sum(i => i.Total);
            decimal sft = lines.Sum(i => i.Sft);
            if (chkAuto.Checked)
            {
                decimal r = Math.Round(sum / 10m, 0, MidpointRounding.AwayFromZero) * 10m;
                txtLabor.Text = (r - sum).ToString("0.00", CultureInfo.InvariantCulture);
            }
            decimal labor = Util.Num(txtLabor.Text), disc = Util.Num(txtDisc.Text), paid = Util.Num(txtCash.Text) + Util.Num(txtBank.Text) + Util.Num(txtBkash.Text);
            decimal sub = sum + labor - disc, net = sub + prevDue;
            txtTotal.Text = Util.M(sum); txtSub.Text = Util.M(sub); txtPrev.Text = Util.M(prevDue);
            txtNet.Text = Util.M(net); txtDue.Text = Util.M(net - paid); txtSft.Text = sft.ToString("0.00", CultureInfo.InvariantCulture);
            busy = false;
        }

        void PickCustomer()
        {
            using (CustomerForm f = new CustomerForm(true))
            {
                if (f.ShowDialog() == DialogResult.OK && f.Picked != null) SetCustomer(f.Picked, true);
            }
        }

        void SetCustomer(Customer c, bool computePrev)
        {
            selCust = c;
            txtCid.Text = c.Id.ToString(); txtCust.Text = c.Name; txtAddr.Text = c.Address; txtPhone.Text = c.Phone; txtDeal.Text = c.Deal;
            selCust = c;
            if (computePrev) prevDue = Db.Balance(c.Id);
            Recalc();
        }

        void NewInvoice()
        {
            editingNo = 0; lines.Clear(); selCust = null; prevDue = 0;
            txtNo.Text = Db.NextInvoiceNo().ToString(); txtCid.Text = ""; txtCust.Text = ""; txtAddr.Text = ""; txtPhone.Text = "";
            txtDeal.Text = ""; txtComment.Text = ""; txtDisc.Text = "0"; txtCash.Text = "0"; txtBank.Text = "0"; txtBkash.Text = "0"; dtp.Value = DateTime.Now;
            chkAuto.Checked = true; txtLabor.ReadOnly = true;
            RefreshGrid();
            txtCust.Focus();
        }

        void Save(int printKind)
        {
            if (lines.Count == 0) { MessageBox.Show("কমপক্ষে একটি পণ্য যোগ করুন।"); return; }
            if (txtCust.Text.Trim().Length == 0) { MessageBox.Show("গ্রাহকের নাম দিন।"); return; }
            Recalc();
            if (selCust == null)
            {
                string nm0 = txtCust.Text.Trim().ToLower(), ph0 = txtPhone.Text.Trim();
                selCust = Db.Customers.FirstOrDefault(cx => cx.Name.ToLower() == nm0 && cx.Phone == ph0);
                if (selCust != null && editingNo == 0) prevDue = Db.Balance(selCust.Id);
            }
            if (selCust == null)
            {
                selCust = new Customer(); selCust.Id = Db.NextCustId();
                selCust.Name = txtCust.Text.Trim();
                Db.Customers.Add(selCust);
                if (editingNo == 0) prevDue = 0;
            }
            selCust.Address = txtAddr.Text.Trim(); selCust.Phone = txtPhone.Text.Trim(); selCust.Deal = txtDeal.Text.Trim();
            Db.SaveCustomers();
            txtCid.Text = selCust.Id.ToString();

            Invoice v;
            if (editingNo > 0)
            {
                v = Db.Invoices.FirstOrDefault(x => x.No == editingNo);
                if (v == null) { v = new Invoice(); v.No = editingNo; Db.Invoices.Add(v); }
            }
            else
            {
                v = new Invoice(); v.No = Db.NextInvoiceNo(); Db.Invoices.Add(v);
                prevDue = Db.Balance(selCust.Id);
            }
            v.Date = dtp.Value; v.CustId = selCust.Id; v.CustName = selCust.Name; v.Address = selCust.Address; v.Phone = selCust.Phone; v.Deal = selCust.Deal;
            v.Comment = txtComment.Text.Trim(); v.Labor = Util.Num(txtLabor.Text); v.Discount = Util.Num(txtDisc.Text);
            v.PrevDue = prevDue; v.Cash = Util.Num(txtCash.Text); v.Bank = Util.Num(txtBank.Text); v.Bkash = Util.Num(txtBkash.Text);
            v.Items = lines.Select(i => new Item { ProductId = i.ProductId, Name = i.Name, Dim = i.Dim, Box = i.Box, Piece = i.Piece, Sft = i.Sft, Unit = i.Unit, Total = i.Total, IsTile = i.IsTile }).ToList();
            try { Db.SaveInvoices(); }
            catch (Exception ex) { MessageBox.Show("সংরক্ষণ করা যায়নি: " + ex.Message); return; }

            if (printKind > 0) Printer.Show(v, printKind == 2);
            else MessageBox.Show("সংরক্ষিত হয়েছে। Invoice No: " + v.No);
            NewInvoice();
            LoadList();
        }

        void LoadList()
        {
            string q = txtSearch.Text.Trim().ToLower();
            DateTime lo = dFrom.Value.Date, hi = dTo.Value.Date;
            shown = Db.Invoices.Where(v => v.Date.Date >= lo && v.Date.Date <= hi &&
                (q.Length == 0 || v.No.ToString().Contains(q) || v.CustName.ToLower().Contains(q) || v.Phone.Contains(q) || v.CustId.ToString() == q))
                .OrderByDescending(v => v.No).ToList();
            glist.Rows.Clear();
            int i = 1;
            foreach (Invoice v in shown) glist.Rows.Add(i++, v.No, v.CustName, v.Address, Util.M(v.Sub2));
            lblSum.Text = "বিল: " + shown.Count + "   বিক্রি: " + Util.M(shown.Sum(v => v.Sub2)) + "\r\nজমা: " + Util.M(shown.Sum(v => v.Paid)) + "   বাকি (এই বিলে): " + Util.M(shown.Sum(v => v.Sub2 - v.Paid));
        }

        Invoice Sel()
        {
            if (glist.CurrentRow == null || glist.CurrentRow.Index < 0 || glist.CurrentRow.Index >= shown.Count) return null;
            return shown[glist.CurrentRow.Index];
        }

        void LoadSelected()
        {
            Invoice v = Sel(); if (v == null) return;
            editingNo = v.No;
            lines = v.Items.Select(i => new Item { ProductId = i.ProductId, Name = i.Name, Dim = i.Dim, Box = i.Box, Piece = i.Piece, Sft = i.Sft, Unit = i.Unit, Total = i.Total, IsTile = i.IsTile }).ToList();
            txtNo.Text = v.No.ToString();
            Customer c = Db.Customers.FirstOrDefault(x => x.Id == v.CustId);
            if (c != null) { selCust = c; } else { selCust = null; }
            txtCid.Text = v.CustId.ToString(); txtCust.Text = v.CustName; txtAddr.Text = v.Address; txtPhone.Text = v.Phone; txtDeal.Text = v.Deal;
            selCust = c; prevDue = v.PrevDue;
            txtComment.Text = v.Comment; dtp.Value = v.Date;
            chkAuto.Checked = false; txtLabor.ReadOnly = false;
            txtLabor.Text = v.Labor.ToString("0.00", CultureInfo.InvariantCulture);
            txtDisc.Text = Util.Q(v.Discount); txtCash.Text = Util.Q(v.Cash); txtBank.Text = Util.Q(v.Bank); txtBkash.Text = Util.Q(v.Bkash);
            RefreshGrid();
        }

        void DeleteSelected()
        {
            Invoice v = Sel(); if (v == null) return;
            if (!UI.Ask("Invoice " + v.No + " মুছে ফেলবেন?")) return;
            Db.Invoices.Remove(v); Db.SaveInvoices();
            if (editingNo == v.No) NewInvoice();
            LoadList();
        }

        void PrintSelected(bool challan)
        {
            Invoice v = Sel(); if (v == null) return;
            Printer.Show(v, challan);
        }
    }

    // ===================== PAY RECEIPT =====================
    class PayForm : Form
    {
        TextBox txtCust, txtAmt, txtRemark; ComboBox cboMethod; Label lblBal; DateTimePicker dtp; DataGridView grid;
        Customer sel; List<Payment> shown = new List<Payment>();

        public PayForm()
        {
            Text = "টাকা জমা (Pay Receipt)";
            Font = new Font("Nirmala UI", 10);
            ClientSize = new Size(780, 560);
            StartPosition = FormStartPosition.CenterScreen;
            UI.L(this, "গ্রাহক :", 10, 15, 100); txtCust = UI.T(this, 115, 15, 300, true);
            UI.B(this, "...", 420, 14, 34, 28, delegate { Pick(); });
            UI.L(this, "বর্তমান বাকি :", 10, 48, 100);
            lblBal = new Label(); lblBal.SetBounds(115, 48, 300, 24); lblBal.Font = new Font("Nirmala UI", 11, FontStyle.Bold); Controls.Add(lblBal);
            UI.L(this, "তারিখ :", 10, 80, 100);
            dtp = new DateTimePicker(); dtp.Format = DateTimePickerFormat.Short; dtp.SetBounds(115, 80, 150, 26); Controls.Add(dtp);
            UI.L(this, "জমার পরিমাণ :", 10, 112, 100); txtAmt = UI.T(this, 115, 112, 150, false);
            UI.L(this, "মাধ্যম :", 270, 112, 70);
            cboMethod = new ComboBox(); cboMethod.SetBounds(345, 112, 110, 26); cboMethod.DropDownStyle = ComboBoxStyle.DropDownList;
            cboMethod.Items.AddRange(new object[] { "Cash", "Bank", "Bkash" }); cboMethod.SelectedIndex = 0; Controls.Add(cboMethod);
            UI.L(this, "মন্তব্য :", 10, 144, 100); txtRemark = UI.T(this, 115, 144, 340, false);
            UI.B(this, "Save", 115, 182, 120, 36, delegate { Save(false); });
            UI.B(this, "Save + Print Receipt", 245, 182, 210, 36, delegate { Save(true); });

            grid = UI.G(this, 10, 235, 760, 270);
            UI.Col(grid, "Receipt", 70, false); UI.Col(grid, "Date", 130, false); UI.Col(grid, "Customer", 200, false);
            UI.Col(grid, "Amount", 100, true); UI.Col(grid, "Method", 70, false); UI.Col(grid, "Remark", 150, false);
            grid.Anchor = AnchorStyles.Top | AnchorStyles.Bottom | AnchorStyles.Left | AnchorStyles.Right;
            Button bp = UI.B(this, "Reprint", 10, 515, 100, 34, delegate { Reprint(); });
            Button bd = UI.B(this, "Delete", 120, 515, 100, 34, delegate { Delete(); });
            bp.Anchor = AnchorStyles.Bottom | AnchorStyles.Left; bd.Anchor = AnchorStyles.Bottom | AnchorStyles.Left;
            Reload();
        }

        void Pick()
        {
            using (CustomerForm f = new CustomerForm(true))
            {
                if (f.ShowDialog() == DialogResult.OK && f.Picked != null)
                {
                    sel = f.Picked; txtCust.Text = sel.Name;
                    lblBal.Text = Util.M(Db.Balance(sel.Id));
                    txtAmt.Focus();
                }
            }
        }

        void Reload()
        {
            shown = Db.Payments.OrderByDescending(p => p.Date).Take(300).ToList();
            grid.Rows.Clear();
            foreach (Payment p in shown) grid.Rows.Add(p.Id, p.Date.ToString("dd-MM-yyyy HH:mm"), p.CustName, Util.M(p.Amount), p.Method, p.Remark);
        }

        void Save(bool print)
        {
            if (sel == null) { MessageBox.Show("গ্রাহক বাছুন।"); return; }
            decimal a = Util.Num(txtAmt.Text);
            if (a <= 0) { MessageBox.Show("জমার পরিমাণ দিন।"); return; }
            Payment p = new Payment();
            p.Id = Db.NextPayId(); p.Date = dtp.Value.Date + DateTime.Now.TimeOfDay; p.CustId = sel.Id; p.CustName = sel.Name; p.Amount = a; p.Remark = txtRemark.Text.Trim(); p.Method = cboMethod.Text;
            Db.Payments.Add(p); Db.SavePayments();
            decimal bal = Db.Balance(sel.Id);
            lblBal.Text = Util.M(bal);
            txtAmt.Text = ""; txtRemark.Text = "";
            Reload();
            if (print) Printer.Receipt(p, bal);
            else MessageBox.Show("জমা সংরক্ষিত হয়েছে।");
        }

        Payment Sel()
        {
            if (grid.CurrentRow == null || grid.CurrentRow.Index < 0 || grid.CurrentRow.Index >= shown.Count) return null;
            return shown[grid.CurrentRow.Index];
        }

        void Reprint() { Payment p = Sel(); if (p != null) Printer.Receipt(p, Db.Balance(p.CustId)); }

        void Delete()
        {
            Payment p = Sel(); if (p == null) return;
            if (!UI.Ask("Receipt " + p.Id + " (" + Util.M(p.Amount) + ") মুছবেন?")) return;
            Db.Payments.Remove(p); Db.SavePayments(); Reload();
            if (sel != null) lblBal.Text = Util.M(Db.Balance(sel.Id));
        }
    }

    // ===================== DUE LIST =====================
    class DueForm : Form
    {
        DataGridView grid; TextBox txtSearch; Label lblTot;
        List<Customer> shown = new List<Customer>();

        public DueForm()
        {
            Text = "বাকির তালিকা (Due List)";
            Font = new Font("Nirmala UI", 10);
            ClientSize = new Size(820, 560);
            StartPosition = FormStartPosition.CenterScreen;
            UI.L(this, "Search :", 10, 12, 70); txtSearch = UI.T(this, 85, 12, 250, false);
            txtSearch.TextChanged += delegate { Reload(); };
            UI.B(this, "Export CSV", 350, 10, 120, 30, delegate { Export(); });
            grid = UI.G(this, 10, 50, 800, 455);
            UI.Col(grid, "ID", 80, false); UI.Col(grid, "Name", 250, false); UI.Col(grid, "Address", 160, false);
            UI.Col(grid, "Mobile", 130, false); UI.Col(grid, "Due", 120, true);
            grid.Anchor = AnchorStyles.Top | AnchorStyles.Bottom | AnchorStyles.Left | AnchorStyles.Right;
            lblTot = new Label(); lblTot.SetBounds(10, 515, 800, 30); lblTot.Font = new Font("Nirmala UI", 12, FontStyle.Bold);
            lblTot.Anchor = AnchorStyles.Bottom | AnchorStyles.Left; Controls.Add(lblTot);
            Reload();
        }

        void Reload()
        {
            string q = txtSearch.Text.Trim().ToLower();
            shown = Db.Customers.Where(c => Db.Balance(c.Id) > 0 && (q.Length == 0 || c.Name.ToLower().Contains(q) || c.Phone.Contains(q) || c.Address.ToLower().Contains(q)))
                .OrderByDescending(c => Db.Balance(c.Id)).ToList();
            grid.Rows.Clear();
            decimal tot = 0;
            foreach (Customer c in shown) { decimal b = Db.Balance(c.Id); tot += b; grid.Rows.Add(c.Id, c.Name, c.Address, c.Phone, Util.M(b)); }
            lblTot.Text = "মোট গ্রাহক: " + shown.Count + "      মোট বাকি: " + Util.M(tot);
        }

        void Export()
        {
            using (SaveFileDialog sf = new SaveFileDialog())
            {
                sf.Filter = "CSV|*.csv"; sf.FileName = "due_list.csv";
                if (sf.ShowDialog() != DialogResult.OK) return;
                StringBuilder sb = new StringBuilder();
                sb.AppendLine("ID,Name,Address,Mobile,Due");
                foreach (Customer c in shown)
                    sb.AppendLine(c.Id + ",\"" + c.Name.Replace("\"", "\"\"") + "\",\"" + c.Address.Replace("\"", "\"\"") + "\"," + c.Phone + "," + Db.Balance(c.Id).ToString("0.00", CultureInfo.InvariantCulture));
                File.WriteAllText(sf.FileName, sb.ToString(), new UTF8Encoding(true));
                MessageBox.Show("সংরক্ষিত: " + sf.FileName);
            }
        }
    }

    // ===================== SETTINGS =====================
    class SettingsForm : Form
    {
        TextBox[] t = new TextBox[8];
        public SettingsForm()
        {
            Text = "দোকানের তথ্য ও সেটিং";
            Font = new Font("Nirmala UI", 10);
            ClientSize = new Size(640, 480);
            StartPosition = FormStartPosition.CenterScreen;
            string[] cap = { "দোকানের নাম", "ঠিকানা", "ফোন নম্বর", "Web / Email", "বিশেষ দ্রষ্টব্য (Invoice-এ)", "Prepared by (নাম)", "শুরুর Invoice নম্বর", "ফুটার লেখা (প্রিন্টের নিচে)" };
            int[] ys = { 15, 55, 95, 135, 175, 260, 300, 340 };
            for (int i = 0; i < 8; i++)
            {
                UI.L(this, cap[i] + " :", 5, ys[i], 190);
                t[i] = UI.T(this, 200, ys[i], 420, false);
                t[i].Text = Db.Shop[i];
            }
            t[4].Multiline = true; t[4].Height = 70;
            UI.B(this, "লোগো বাছুন (logo.png)", 200, 405, 200, 34, delegate { Logo(); });
            UI.B(this, "Save", 410, 405, 100, 34, delegate { Save(); });
        }

        void Logo()
        {
            using (OpenFileDialog of = new OpenFileDialog())
            {
                of.Filter = "Image|*.png;*.jpg;*.jpeg;*.bmp";
                if (of.ShowDialog() != DialogResult.OK) return;
                try
                {
                    using (Image im = Image.FromFile(of.FileName)) im.Save(Db.P("logo.png"), System.Drawing.Imaging.ImageFormat.Png);
                    MessageBox.Show("লোগো সেট হয়েছে।");
                }
                catch (Exception ex) { MessageBox.Show(ex.Message); }
            }
        }

        void Save()
        {
            for (int i = 0; i < 8; i++) Db.Shop[i] = t[i].Text.Trim();
            Db.SaveShop();
            Close();
        }
    }

    // ===================== REPORT ENGINE =====================
    class RBlock
    {
        public string Caption; public string[] Heads; public float[] W; public bool[] Right;
        public List<string[]> Rows = new List<string[]>(); public string[] Total;
    }
    class Rpt
    {
        public string Title = "", Period = "";
        public List<string> Info = new List<string>();
        public List<RBlock> Blocks = new List<RBlock>();
        public List<string[]> Summary = new List<string[]>();
    }
    class RRow { public int Kind; public string[] Cells; public RBlock B; public bool First; public int Count; }

    static class RptPrinter
    {
        public static PrintDocument MakeDoc(Rpt r)
        {
            List<RRow> rows = Flatten(r);
            int idx = 0, page = 0;
            PrintDocument pd = new PrintDocument();
            pd.BeginPrint += delegate { idx = 0; page = 0; };
            pd.PrintPage += delegate(object s, PrintPageEventArgs e) { page++; idx = Draw(r, rows, idx, page, e); };
            return pd;
        }

        static List<RRow> Flatten(Rpt r)
        {
            List<RRow> rows = new List<RRow>();
            RRow p = new RRow(); p.Kind = 7; p.Cells = new string[] { r.Period, "Print date : " + DateTime.Now.ToString("d/M/yyyy", CultureInfo.InvariantCulture) }; rows.Add(p);
            foreach (string t in r.Info) { RRow x = new RRow(); x.Kind = 0; x.Cells = new string[] { t }; rows.Add(x); }
            foreach (RBlock b in r.Blocks)
            {
                if (b.Caption != null) { RRow c = new RRow(); c.Kind = 1; c.Cells = new string[] { b.Caption }; rows.Add(c); }
                RRow h = new RRow(); h.Kind = 2; h.B = b; h.Cells = b.Heads; rows.Add(h);
                foreach (string[] d in b.Rows) { RRow x = new RRow(); x.Kind = 3; x.B = b; x.Cells = d; rows.Add(x); }
                if (b.Total != null) { RRow x = new RRow(); x.Kind = 4; x.B = b; x.Cells = b.Total; rows.Add(x); }
                RRow sp = new RRow(); sp.Kind = 6; rows.Add(sp);
            }
            for (int i = 0; i < r.Summary.Count; i++)
            {
                RRow x = new RRow(); x.Kind = 5; x.Cells = r.Summary[i]; x.First = i == 0; x.Count = r.Summary.Count; rows.Add(x);
            }
            return rows;
        }

        static float[] Scale(float[] w, float W)
        {
            float sum = w.Sum();
            float[] r = new float[w.Length];
            for (int i = 0; i < w.Length; i++) r[i] = w[i] * W / sum;
            return r;
        }

        static float Height(RRow r)
        {
            switch (r.Kind)
            {
                case 1: return 32;
                case 2: return 26;
                case 4: return 24;
                case 6: return 10;
                case 5: return r.First ? r.Count * 22 + 8 : 22;
                default: return 22;
            }
        }

        static void DrawHead(Graphics g, Pen pk, Font fb, RBlock b, float x0, float W, float y)
        {
            float[] cw = Scale(b.W, W);
            float x = x0;
            for (int i = 0; i < cw.Length; i++)
            {
                g.DrawRectangle(pk, x, y, cw[i], 26);
                Printer.T(g, b.Heads[i], fb, Brushes.Black, x, y, cw[i], 26, StringAlignment.Center);
                x += cw[i];
            }
        }

        static int Draw(Rpt r, List<RRow> rows, int idx, int page, PrintPageEventArgs e)
        {
            Graphics g = e.Graphics;
            float x0 = 40, W = e.PageBounds.Width - 80, H = e.PageBounds.Height, bottom = H - 60;
            using (Font fb = new Font("Nirmala UI", 10, FontStyle.Bold))
            using (Font fn = new Font("Nirmala UI", 9.5f))
            using (Font fs = new Font("Nirmala UI", 8.5f))
            using (Font ft = new Font("Nirmala UI", 14, FontStyle.Bold | FontStyle.Underline))
            using (Pen pk = new Pen(Color.Black, 1))
            {
                float y = Printer.Header(g, x0, W);
                Printer.T(g, r.Title, ft, Brushes.Black, x0, y, W, 28, StringAlignment.Center);
                y += 32;
                bool first = true;
                while (idx < rows.Count)
                {
                    RRow row = rows[idx];
                    float h = Height(row);
                    if (!first && y + h > bottom) break;
                    if (first && (row.Kind == 3 || row.Kind == 4))
                    {
                        DrawHead(g, pk, fb, row.B, x0, W, y); y += 26;
                    }
                    switch (row.Kind)
                    {
                        case 0:
                            Printer.T(g, row.Cells[0], fb, Brushes.Black, x0, y, W, 22, StringAlignment.Near);
                            break;
                        case 7:
                            Printer.T(g, row.Cells[0], fn, Brushes.Black, x0, y, W, 22, StringAlignment.Near);
                            Printer.T(g, row.Cells[1], fn, Brushes.Black, x0, y, W, 22, StringAlignment.Far);
                            break;
                        case 1:
                            g.DrawRectangle(pk, x0 + (W - 180) / 2, y + 2, 180, 24);
                            Printer.T(g, row.Cells[0], fn, Brushes.Black, x0 + (W - 180) / 2, y + 2, 180, 24, StringAlignment.Center);
                            break;
                        case 2:
                            DrawHead(g, pk, fb, row.B, x0, W, y);
                            break;
                        case 3:
                        case 4:
                            {
                                float[] cw = Scale(row.B.W, W);
                                float x = x0;
                                for (int i = 0; i < cw.Length; i++)
                                {
                                    string txt = i < row.Cells.Length ? row.Cells[i] : "";
                                    if (row.Kind == 3)
                                    {
                                        g.DrawRectangle(pk, x, y, cw[i], 22);
                                        bool right = row.B.Right != null && row.B.Right[i];
                                        Printer.T(g, txt, fn, Brushes.Black, x + 3, y, cw[i] - 6, 22, right ? StringAlignment.Far : StringAlignment.Near);
                                    }
                                    else Printer.T(g, txt, fb, Brushes.Black, x + 3, y, cw[i] - 6, 24, StringAlignment.Far);
                                    x += cw[i];
                                }
                            }
                            break;
                        case 5:
                            {
                                float bx = x0 + W - 300;
                                if (row.First) g.DrawRectangle(pk, bx, y, 300, row.Count * 22 + 8);
                                Printer.T(g, row.Cells[0], fb, Brushes.Black, bx + 4, y + 4, 190, 22, StringAlignment.Far);
                                Printer.T(g, row.Cells[1], fb, Brushes.Black, bx + 196, y + 4, 98, 22, StringAlignment.Far);
                            }
                            break;
                    }
                    y += (row.Kind == 5 ? 22 : h);
                    idx++; first = false;
                }
                Printer.T(g, "Page " + page, fs, Brushes.Black, x0, H - 40, W, 18, StringAlignment.Far);
                e.HasMorePages = idx < rows.Count;
            }
            return idx;
        }
    }

    static class Reports
    {
        static readonly CultureInfo Inv = CultureInfo.InvariantCulture;
        static decimal Qty(Item i) { return i.IsTile ? i.Sft : i.Piece; }
        static decimal QtyOf(Invoice v) { return v.Items.Sum(i => i.IsTile ? i.Sft : i.Piece); }
        static string Qs(decimal d) { return d.ToString("0.00", Inv); }
        static string Ds(DateTime d) { return d.ToString("dd/MM/yyyy", Inv); }
        static List<Invoice> InRange(DateTime a, DateTime b)
        {
            DateTime lo = a.Date, hi = b.Date;
            return Db.Invoices.Where(v => v.Date.Date >= lo && v.Date.Date <= hi).OrderBy(v => v.No).ToList();
        }
        static Rpt New(string title, DateTime a, DateTime b)
        {
            Rpt r = new Rpt(); r.Title = title; r.Period = Ds(a) + " হতে " + Ds(b) + " পর্যন্ত"; return r;
        }
        static RBlock Blk(string cap, string[] h, float[] w, bool[] right)
        {
            RBlock x = new RBlock(); x.Caption = cap; x.Heads = h; x.W = w; x.Right = right; return x;
        }

        public static Rpt Daily(DateTime a, DateTime b)
        {
            Rpt r = New("Daily Transaction", a, b);
            DateTime lo = a.Date, hi = b.Date;
            string[] h = { "SL", "Invoice", "Customer", "Comment", "Others", "Amount", "Due" };
            float[] w = { 35, 80, 200, 130, 70, 90, 90 };
            bool[] rt = { false, false, false, false, false, true, true };
            int sl = 1;
            RBlock pb = Blk("Pay Recipt", h, w, rt);
            decimal recv = 0;
            foreach (Payment p in Db.Payments.Where(x => x.Date.Date >= lo && x.Date.Date <= hi).OrderBy(x => x.Date))
            {
                pb.Rows.Add(new string[] { (sl++).ToString(), p.Id.ToString(), p.CustName, p.Remark, p.Method, Util.M(p.Amount), Util.M(Db.Balance(p.CustId)) });
                recv += p.Amount;
            }
            pb.Total = new string[] { "", "", "", "", "", Util.M(recv), "" };
            r.Blocks.Add(pb);
            RBlock ib = Blk("Daily Invoice", h, w, rt);
            decimal paid = 0, due = 0;
            foreach (Invoice v in InRange(a, b))
            {
                ib.Rows.Add(new string[] { (sl++).ToString(), v.No.ToString(), v.CustName, v.Comment, "", Util.M(v.Paid), Util.M(v.Due) });
                paid += v.Paid; due += v.Due;
            }
            ib.Total = new string[] { "", "", "", "", "", Util.M(paid), Util.M(due) };
            r.Blocks.Add(ib);
            RBlock mb = Blk("Received By", new string[] { "Method", "Invoice", "Pay Receipt", "Total" }, new float[] { 120, 110, 110, 110 }, new bool[] { false, true, true, true });
            string[] meths = { "Cash", "Bank", "Bkash" };
            decimal ti = 0, tpm = 0;
            List<Invoice> invs = InRange(a, b);
            List<Payment> pays = Db.Payments.Where(x => x.Date.Date >= lo && x.Date.Date <= hi).ToList();
            for (int mi = 0; mi < 3; mi++)
            {
                string mn = meths[mi];
                decimal iv = mi == 0 ? invs.Sum(v => v.Cash) : mi == 1 ? invs.Sum(v => v.Bank) : invs.Sum(v => v.Bkash);
                decimal pv = pays.Where(x => string.Equals(x.Method, mn, StringComparison.OrdinalIgnoreCase) || (mi == 0 && x.Method.Length == 0)).Sum(x => x.Amount);
                mb.Rows.Add(new string[] { mn, Util.M(iv), Util.M(pv), Util.M(iv + pv) });
                ti += iv; tpm += pv;
            }
            mb.Total = new string[] { "Total =", Util.M(ti), Util.M(tpm), Util.M(ti + tpm) };
            r.Blocks.Add(mb);
            decimal income = Db.Txns.Where(t => t.IsIncome && t.Date.Date >= lo && t.Date.Date <= hi).Sum(t => t.Amount);
            decimal expense = Db.Txns.Where(t => !t.IsIncome && t.Date.Date >= lo && t.Date.Date <= hi).Sum(t => t.Amount);
            decimal cash1 = paid + recv, cash2 = cash1 + income;
            r.Summary.Add(new string[] { "Total Sales =", Util.M(paid) });
            r.Summary.Add(new string[] { "(+)Total Pay receipt =", Util.M(recv) });
            r.Summary.Add(new string[] { "Total Cash =", Util.M(cash1) });
            r.Summary.Add(new string[] { "(+)Total Income =", Util.M(income) });
            r.Summary.Add(new string[] { "Total Cash =", Util.M(cash2) });
            r.Summary.Add(new string[] { "(-)Total Expense =", Util.M(expense) });
            r.Summary.Add(new string[] { "Total Balance =", Util.M(cash2 - expense) });
            return r;
        }

        public static Rpt DateWise(DateTime a, DateTime b)
        {
            Rpt r = New("Date Wise Sales", a, b);
            RBlock bl = Blk(null, new string[] { "SL", "Sales Date", "Invoices", "Sales Qty", "Sales Amount", "Paid", "Due" },
                new float[] { 35, 110, 80, 100, 120, 100, 100 }, new bool[] { false, false, true, true, true, true, true });
            int sl = 1, cnt = 0; decimal tq = 0, ta = 0, tp = 0;
            foreach (var gr in InRange(a, b).GroupBy(v => v.Date.Date).OrderBy(k => k.Key))
            {
                decimal q = gr.Sum(v => QtyOf(v)), am = gr.Sum(v => v.Sub2), pd = gr.Sum(v => v.Paid);
                bl.Rows.Add(new string[] { (sl++).ToString(), Ds(gr.Key), gr.Count().ToString(), Qs(q), Util.M(am), Util.M(pd), Util.M(am - pd) });
                cnt += gr.Count(); tq += q; ta += am; tp += pd;
            }
            bl.Total = new string[] { "", "Total =", cnt.ToString(), Qs(tq), Util.M(ta), Util.M(tp), Util.M(ta - tp) };
            r.Blocks.Add(bl);
            return r;
        }

        public static Rpt CustomerWise(DateTime a, DateTime b, Customer c)
        {
            Rpt r = New("Customer Wise Sales", a, b);
            r.Info.Add("Customer Name : " + c.Name);
            RBlock bl = Blk(null, new string[] { "SL", "Invoice", "Sales Date", "Sales Qty", "Amount" },
                new float[] { 40, 110, 120, 110, 120 }, new bool[] { false, false, false, true, true });
            int sl = 1; decimal tq = 0, ta = 0;
            foreach (Invoice v in InRange(a, b).Where(x => x.CustId == c.Id))
            {
                decimal q = QtyOf(v);
                bl.Rows.Add(new string[] { (sl++).ToString(), v.No.ToString(), Ds(v.Date), Qs(q), Util.M(v.Sub2) });
                tq += q; ta += v.Sub2;
            }
            bl.Total = new string[] { "", "", "Total =", Qs(tq), Util.M(ta) };
            r.Blocks.Add(bl);
            return r;
        }

        public static Rpt DateProduct(DateTime a, DateTime b, Product p)
        {
            Rpt r = New("Date and Product Wise Sales", a, b);
            r.Info.Add("Product Name : " + (p == null ? "All Products" : p.Name));
            RBlock bl = Blk(null, new string[] { "SL", "Invoice", "Sales Date", "Customer", "Sales Qty", "Price", "Total Price" },
                new float[] { 35, 80, 90, 190, 90, 80, 100 }, new bool[] { false, false, false, false, true, true, true });
            int sl = 1; decimal tq = 0, ta = 0;
            foreach (Invoice v in InRange(a, b))
            {
                foreach (Item it in v.Items)
                {
                    if (p != null && it.ProductId != p.Id) continue;
                    decimal q = Qty(it);
                    bl.Rows.Add(new string[] { (sl++).ToString(), v.No.ToString(), Ds(v.Date), v.CustName + (p == null ? " | " + it.Name : ""), Qs(q), Util.M(it.Unit), Util.M(it.Total) });
                    tq += q; ta += it.Total;
                }
            }
            bl.Total = new string[] { "", "", "", "Total =", Qs(tq), "", Util.M(ta) };
            r.Blocks.Add(bl);
            return r;
        }

        public static Rpt AccountType(DateTime a, DateTime b, int type)
        {
            Rpt r = New("Account Type Wise Sales", a, b);
            r.Info.Add("Account Type : " + (type == 1 ? "Cash (সম্পূর্ণ পরিশোধ)" : type == 2 ? "Credit (বাকি আছে)" : "All"));
            RBlock bl = Blk(null, new string[] { "SL", "Invoice", "Sales Date", "Customer", "Amount", "Paid", "Due" },
                new float[] { 35, 80, 90, 200, 100, 100, 100 }, new bool[] { false, false, false, false, true, true, true });
            int sl = 1; decimal ta = 0, tp = 0;
            foreach (Invoice v in InRange(a, b))
            {
                decimal d = v.Sub2 - v.Paid;
                if (type == 1 && d > 0) continue;
                if (type == 2 && d <= 0) continue;
                bl.Rows.Add(new string[] { (sl++).ToString(), v.No.ToString(), Ds(v.Date), v.CustName, Util.M(v.Sub2), Util.M(v.Paid), Util.M(d) });
                ta += v.Sub2; tp += v.Paid;
            }
            bl.Total = new string[] { "", "", "", "Total =", Util.M(ta), Util.M(tp), Util.M(ta - tp) };
            r.Blocks.Add(bl);
            return r;
        }

        public static Rpt Dealer(DateTime a, DateTime b, string deal)
        {
            Rpt r = New("Dealer Wise Sales", a, b);
            r.Info.Add("Dealer Name : " + deal);
            RBlock bl = Blk(null, new string[] { "SL", "Invoice", "Sales Date", "Sales Qty", "Amount" },
                new float[] { 40, 110, 120, 110, 120 }, new bool[] { false, false, false, true, true });
            int sl = 1; decimal tq = 0, ta = 0;
            foreach (Invoice v in InRange(a, b).Where(x => x.Deal == deal))
            {
                decimal q = QtyOf(v);
                bl.Rows.Add(new string[] { (sl++).ToString(), v.No.ToString(), Ds(v.Date), Qs(q), Util.M(v.Sub2) });
                tq += q; ta += v.Sub2;
            }
            bl.Total = new string[] { "", "", "Total =", Qs(tq), Util.M(ta) };
            r.Blocks.Add(bl);
            return r;
        }

        public static Rpt ProductWise(DateTime a, DateTime b, Product p)
        {
            Rpt r = New("Product Wise Sales", a, b);
            r.Info.Add("Product Name : " + (p == null ? "All Products" : p.Name));
            RBlock bl = Blk(null, new string[] { "SL", "Product Name", "Sales Qty", "Total Price" },
                new float[] { 40, 300, 110, 130 }, new bool[] { false, false, true, true });
            int sl = 1; decimal tq = 0, ta = 0;
            var items = InRange(a, b).SelectMany(v => v.Items).Where(i => p == null || i.ProductId == p.Id);
            foreach (var gr in items.GroupBy(i => i.Name).OrderBy(k => k.Key))
            {
                decimal q = gr.Sum(i => Qty(i)), am = gr.Sum(i => i.Total);
                bl.Rows.Add(new string[] { (sl++).ToString(), gr.Key, Qs(q), Util.M(am) });
                tq += q; ta += am;
            }
            bl.Total = new string[] { "", "Total =", Qs(tq), Util.M(ta) };
            r.Blocks.Add(bl);
            return r;
        }
    }

    // ===================== SALES REPORT FORM =====================
    class Sel
    {
        public string Text; public object Key;
        public override string ToString() { return Text; }
    }

    class SalesReportForm : Form
    {
        ListBox lstReport = new ListBox(), lstSel = new ListBox();
        TextBox txtFind; DateTimePicker dFrom, dTo;
        PrintPreviewControl ppc = new PrintPreviewControl();
        PrintDocument pd;

        public SalesReportForm()
        {
            Text = "SalesWiseReport";
            Font = new Font("Nirmala UI", 11);
            WindowState = FormWindowState.Maximized;
            MinimumSize = new Size(1000, 600);

            Panel left = new Panel(); left.Dock = DockStyle.Left; left.Width = 340; left.BackColor = Color.FromArgb(192, 255, 255);
            Panel lt = new Panel(); lt.Dock = DockStyle.Top; lt.Height = 250;
            Panel lb = new Panel(); lb.Dock = DockStyle.Bottom; lb.Height = 110;
            lstReport.SetBounds(5, 5, 330, 205);
            lstReport.Items.AddRange(new object[] { "1. Daily sales report", "2. Date wise sales", "3. Customer wise sales", "4. Date and product wise sales", "5. Account type wise sales", "6. Dealer wise Report", "7. Product wise sales", "8. Customer wise product list" });
            lt.Controls.Add(lstReport);
            txtFind = UI.T(lt, 5, 214, 330, false);
            lstSel.Dock = DockStyle.Fill;
            left.Controls.Add(lstSel); left.Controls.Add(lt); left.Controls.Add(lb);
            lstSel.BringToFront();

            dFrom = new DateTimePicker(); dFrom.Format = DateTimePickerFormat.Short; dFrom.SetBounds(5, 8, 140, 28);
            dFrom.Value = new DateTime(DateTime.Today.Year, DateTime.Today.Month, 1);
            dTo = new DateTimePicker(); dTo.Format = DateTimePickerFormat.Short; dTo.SetBounds(195, 8, 140, 28);
            Label to = new Label(); to.Text = "To :"; to.SetBounds(150, 10, 42, 24); lb.Controls.Add(to);
            lb.Controls.Add(dFrom); lb.Controls.Add(dTo);
            Button bp = UI.B(lb, "Preview", 5, 48, 330, 48, delegate { Preview(); });
            bp.BackColor = Color.Teal; bp.ForeColor = Color.White; bp.Font = new Font("Nirmala UI", 14);

            Panel right = new Panel(); right.Dock = DockStyle.Fill;
            Panel bar = new Panel(); bar.Dock = DockStyle.Top; bar.Height = 44;
            ppc.Dock = DockStyle.Fill; ppc.UseAntiAlias = true; ppc.AutoZoom = true;
            right.Controls.Add(ppc); right.Controls.Add(bar); ppc.BringToFront();
            UI.B(bar, "Print", 5, 6, 80, 32, delegate { DoPrint(); });
            UI.B(bar, "Zoom +", 95, 6, 80, 32, delegate { Zoom(1.25); });
            UI.B(bar, "Zoom -", 185, 6, 80, 32, delegate { Zoom(0.8); });
            UI.B(bar, "Fit", 275, 6, 60, 32, delegate { ppc.AutoZoom = true; });
            UI.B(bar, "< Prev", 345, 6, 80, 32, delegate { ppc.StartPage = Math.Max(0, ppc.StartPage - 1); });
            UI.B(bar, "Next >", 435, 6, 80, 32, delegate { ppc.StartPage = ppc.StartPage + 1; });
            Controls.Add(right); Controls.Add(left); right.BringToFront();

            lstReport.SelectedIndexChanged += delegate { FillSel(); };
            txtFind.TextChanged += delegate { FillSel(); };
            lstReport.SelectedIndex = 0;
        }

        void Zoom(double f)
        {
            if (ppc.AutoZoom) { ppc.AutoZoom = false; ppc.Zoom = 0.8; }
            ppc.Zoom = Math.Max(0.2, Math.Min(4.0, ppc.Zoom * f));
        }

        void DoPrint()
        {
            if (pd == null) { MessageBox.Show("আগে Preview করুন।"); return; }
            using (PrintDialog dlg = new PrintDialog())
            {
                dlg.Document = pd;
                if (dlg.ShowDialog() == DialogResult.OK) pd.Print();
            }
        }

        void FillSel()
        {
            int k = lstReport.SelectedIndex;
            string q = txtFind.Text.Trim().ToLower();
            lstSel.Items.Clear();
            bool need = k >= 2;
            txtFind.Visible = need; lstSel.Visible = need;
            if (k == 2 || k == 7)
            {
                foreach (Customer c in Db.Customers.Where(x => q.Length == 0 || x.Name.ToLower().Contains(q) || x.Phone.Contains(q)).OrderBy(x => x.Name))
                { Sel s = new Sel(); s.Text = c.Name + " (" + c.Id + ")"; s.Key = c; lstSel.Items.Add(s); }
            }
            else if (k == 3 || k == 6)
            {
                Sel all = new Sel(); all.Text = "(সব পণ্য)"; all.Key = null; lstSel.Items.Add(all);
                foreach (Product p in Db.Products.Where(x => q.Length == 0 || x.Name.ToLower().Contains(q)).OrderBy(x => x.Name))
                { Sel s = new Sel(); s.Text = p.Name; s.Key = p; lstSel.Items.Add(s); }
            }
            else if (k == 4)
            {
                string[] names = { "সব (All)", "নগদ (সম্পূর্ণ পরিশোধ)", "বাকি (Credit)" };
                for (int i = 0; i < 3; i++) { Sel s = new Sel(); s.Text = names[i]; s.Key = i; lstSel.Items.Add(s); }
            }
            else if (k == 5)
            {
                foreach (string d in Db.Invoices.Select(x => x.Deal).Where(x => x.Length > 0 && (q.Length == 0 || x.ToLower().Contains(q))).Distinct().OrderBy(x => x))
                { Sel s = new Sel(); s.Text = d; s.Key = d; lstSel.Items.Add(s); }
            }
            if ((k == 3 || k == 4 || k == 6) && lstSel.Items.Count > 0) lstSel.SelectedIndex = 0;
        }

        void Preview()
        {
            int k = lstReport.SelectedIndex; if (k < 0) return;
            DateTime a = dFrom.Value.Date, b = dTo.Value.Date;
            Sel s = lstSel.SelectedItem as Sel;
            Rpt r = null;
            switch (k)
            {
                case 0: r = Reports.Daily(a, b); break;
                case 1: r = Reports.DateWise(a, b); break;
                case 2:
                    if (s == null) { MessageBox.Show("তালিকা থেকে গ্রাহক বাছুন।"); return; }
                    r = Reports.CustomerWise(a, b, (Customer)s.Key); break;
                case 3:
                    r = Reports.DateProduct(a, b, s == null ? null : s.Key as Product); break;
                case 4:
                    r = Reports.AccountType(a, b, s == null ? 0 : (int)s.Key); break;
                case 5:
                    if (s == null) { MessageBox.Show("তালিকা থেকে ডিলার বাছুন (Order-এ Cust. Deal ঘরে যা লেখা হয়)।"); return; }
                    r = Reports.Dealer(a, b, (string)s.Key); break;
                case 6:
                    r = Reports.ProductWise(a, b, s == null ? null : s.Key as Product); break;
                case 7:
                    if (s == null) { MessageBox.Show("তালিকা থেকে গ্রাহক বাছুন।"); return; }
                    using (CustomerProductForm f = new CustomerProductForm((Customer)s.Key)) f.ShowDialog();
                    return;
            }
            pd = RptPrinter.MakeDoc(r);
            ppc.Document = pd;
            ppc.StartPage = 0;
            ppc.AutoZoom = true;
        }
    }

    // ===================== CUSTOMER WISE PRODUCT LIST =====================
    class CustomerProductForm : Form
    {
        Label lblSel, lblTot; ListBox lst; DataGridView grid; Customer c;

        public CustomerProductForm(Customer cu)
        {
            c = cu;
            Text = "CustomerWiseProductList";
            Font = new Font("Nirmala UI", 10);
            ClientSize = new Size(1000, 640);
            StartPosition = FormStartPosition.CenterScreen;
            lblSel = new Label(); lblSel.SetBounds(5, 5, 330, 44); lblSel.BackColor = Color.FromArgb(255, 128, 128);
            lblSel.Font = new Font("Nirmala UI", 16); lblSel.TextAlign = ContentAlignment.MiddleCenter; Controls.Add(lblSel);
            lst = new ListBox(); lst.SetBounds(5, 52, 330, 580); lst.Anchor = AnchorStyles.Top | AnchorStyles.Bottom | AnchorStyles.Left; Controls.Add(lst);
            UI.L(this, "Customer :", 345, 12, 90); UI.T(this, 440, 10, 300, true).Text = c.Name;
            UI.L(this, "Customer ID :", 745, 12, 110); UI.T(this, 860, 10, 130, true).Text = c.Id.ToString();
            UI.L(this, "Short Add :", 345, 46, 90); UI.T(this, 440, 44, 300, true).Text = c.Address;
            UI.L(this, "Mobile :", 745, 46, 110); UI.T(this, 860, 44, 130, true).Text = c.Phone;
            grid = UI.G(this, 345, 85, 650, 510);
            UI.Col(grid, "SL", 40, false); UI.Col(grid, "Invoice No", 90, false); UI.Col(grid, "Date", 90, false);
            UI.Col(grid, "Product Name", 210, false); UI.Col(grid, "Sales Qty", 70, true); UI.Col(grid, "Sales Price", 70, true); UI.Col(grid, "Total Price", 90, true);
            grid.Anchor = AnchorStyles.Top | AnchorStyles.Bottom | AnchorStyles.Left | AnchorStyles.Right;
            lblTot = new Label(); lblTot.SetBounds(345, 602, 650, 28); lblTot.Font = new Font("Nirmala UI", 11, FontStyle.Bold);
            lblTot.Anchor = AnchorStyles.Bottom | AnchorStyles.Left; Controls.Add(lblTot);

            lst.Items.Add("(সব পণ্য)");
            foreach (string n in Db.Invoices.Where(v => v.CustId == c.Id).SelectMany(v => v.Items).Select(i => i.Name).Distinct().OrderBy(n2 => n2)) lst.Items.Add(n);
            lst.SelectedIndexChanged += delegate { Fill(); };
            lst.SelectedIndex = 0;
        }

        void Fill()
        {
            string sel = lst.SelectedIndex <= 0 ? null : lst.SelectedItem.ToString();
            lblSel.Text = sel == null ? "(সব পণ্য)" : sel;
            grid.Rows.Clear();
            int sl = 1; decimal tq = 0, ta = 0;
            foreach (Invoice v in Db.Invoices.Where(x => x.CustId == c.Id).OrderBy(x => x.No))
            {
                foreach (Item it in v.Items)
                {
                    if (sel != null && it.Name != sel) continue;
                    decimal q = it.IsTile ? it.Sft : it.Piece;
                    grid.Rows.Add(sl++, v.No, v.Date.ToString("dd-MM-yyyy"), it.Name, Util.M(q), Util.M(it.Unit), Util.M(it.Total));
                    tq += q; ta += it.Total;
                }
            }
            lblTot.Text = "মোট পরিমাণ: " + Util.M(tq) + "      মোট টাকা: " + Util.M(ta);
        }
    }

    // ===================== INCOME / EXPENSE =====================
    class IncomeForm : Form
    {
        DateTimePicker dtp = new DateTimePicker(); ComboBox cbo = new ComboBox();
        TextBox txtHead, txtAmt; DataGridView grid; Label lblTot;
        List<Txn> shown = new List<Txn>();

        public IncomeForm()
        {
            Text = "আয়-ব্যয় (Income Expend)";
            Font = new Font("Nirmala UI", 10);
            ClientSize = new Size(760, 540);
            StartPosition = FormStartPosition.CenterScreen;
            UI.L(this, "তারিখ :", 10, 15, 90); dtp.Format = DateTimePickerFormat.Short; dtp.SetBounds(105, 15, 150, 26); Controls.Add(dtp);
            UI.L(this, "ধরন :", 10, 48, 90);
            cbo.SetBounds(105, 48, 200, 26); cbo.DropDownStyle = ComboBoxStyle.DropDownList;
            cbo.Items.Add("Income (আয়)"); cbo.Items.Add("Expense (খরচ)"); cbo.SelectedIndex = 1; Controls.Add(cbo);
            UI.L(this, "বিবরণ :", 10, 81, 90); txtHead = UI.T(this, 105, 81, 350, false);
            UI.L(this, "পরিমাণ :", 10, 114, 90); txtAmt = UI.T(this, 105, 114, 150, false);
            UI.B(this, "Save", 105, 152, 110, 34, delegate { Save(); });
            UI.B(this, "Delete", 225, 152, 110, 34, delegate { Delete(); });
            grid = UI.G(this, 10, 200, 740, 290);
            UI.Col(grid, "ID", 60, false); UI.Col(grid, "Date", 130, false); UI.Col(grid, "Type", 110, false);
            UI.Col(grid, "বিবরণ", 300, false); UI.Col(grid, "Amount", 110, true);
            grid.Anchor = AnchorStyles.Top | AnchorStyles.Bottom | AnchorStyles.Left | AnchorStyles.Right;
            lblTot = new Label(); lblTot.SetBounds(10, 500, 740, 28); lblTot.Font = new Font("Nirmala UI", 11, FontStyle.Bold);
            lblTot.Anchor = AnchorStyles.Bottom | AnchorStyles.Left; Controls.Add(lblTot);
            Reload();
        }

        void Reload()
        {
            shown = Db.Txns.OrderByDescending(t => t.Date).Take(300).ToList();
            grid.Rows.Clear();
            foreach (Txn t in shown) grid.Rows.Add(t.Id, t.Date.ToString("dd-MM-yyyy"), t.IsIncome ? "Income" : "Expense", t.Head, Util.M(t.Amount));
            DateTime today = DateTime.Today;
            lblTot.Text = "আজকের আয়: " + Util.M(Db.Txns.Where(t => t.IsIncome && t.Date.Date == today).Sum(t => t.Amount)) +
                "      আজকের খরচ: " + Util.M(Db.Txns.Where(t => !t.IsIncome && t.Date.Date == today).Sum(t => t.Amount));
        }

        void Save()
        {
            decimal a = Util.Num(txtAmt.Text);
            if (a <= 0) { MessageBox.Show("পরিমাণ দিন।"); return; }
            Txn t = new Txn();
            t.Id = Db.NextTxnId(); t.Date = dtp.Value.Date; t.IsIncome = cbo.SelectedIndex == 0;
            t.Head = txtHead.Text.Trim().Length == 0 ? "-" : txtHead.Text.Trim(); t.Amount = a;
            Db.Txns.Add(t); Db.SaveTxns();
            txtHead.Text = ""; txtAmt.Text = "";
            Reload();
        }

        void Delete()
        {
            if (grid.CurrentRow == null || grid.CurrentRow.Index < 0 || grid.CurrentRow.Index >= shown.Count) return;
            Txn t = shown[grid.CurrentRow.Index];
            if (!UI.Ask("এন্ট্রি " + t.Id + " (" + Util.M(t.Amount) + ") মুছবেন?")) return;
            Db.Txns.Remove(t); Db.SaveTxns(); Reload();
        }
    }

    // ===================== MAIN =====================
    class MainForm : Form
    {
        Label vBills, vSales, vColl, vDue, vCust, vProd, lblDir;

        ToolStripButton Tb(string t, EventHandler h)
        {
            ToolStripButton b = new ToolStripButton(t); b.Click += h; b.Padding = new Padding(8, 6, 8, 6); return b;
        }

        Label Tile(string title, Color c, int col, int row)
        {
            Panel p = new Panel(); p.BackColor = c; p.SetBounds(30 + col * 290, 90 + row * 140, 270, 120); Controls.Add(p);
            Label a = new Label(); a.Text = title; a.ForeColor = Color.White; a.Font = new Font("Nirmala UI", 12, FontStyle.Bold); a.SetBounds(10, 8, 250, 28); p.Controls.Add(a);
            Label v = new Label(); v.Text = "0"; v.ForeColor = Color.White; v.Font = new Font("Nirmala UI", 24, FontStyle.Bold); v.SetBounds(10, 50, 250, 52); p.Controls.Add(v);
            return v;
        }

        public MainForm()
        {
            Text = "Tiles Billing";
            Font = new Font("Nirmala UI", 10);
            ClientSize = new Size(930, 440);
            StartPosition = FormStartPosition.CenterScreen;
            ToolStrip ts = new ToolStrip(); ts.Font = new Font("Nirmala UI", 11); ts.GripStyle = ToolStripGripStyle.Hidden;
            ts.Items.Add(Tb("Order", delegate { new OrderForm().ShowDialog(); RefreshTiles(); }));
            ts.Items.Add(new ToolStripSeparator());
            ts.Items.Add(Tb("Customer", delegate { new CustomerForm(false).ShowDialog(); RefreshTiles(); }));
            ts.Items.Add(new ToolStripSeparator());
            ts.Items.Add(Tb("Products", delegate { new ProductForm().ShowDialog(); RefreshTiles(); }));
            ts.Items.Add(new ToolStripSeparator());
            ts.Items.Add(Tb("Pay Receipt", delegate { new PayForm().ShowDialog(); RefreshTiles(); }));
            ts.Items.Add(new ToolStripSeparator());
            ts.Items.Add(Tb("Due List", delegate { new DueForm().ShowDialog(); }));
            ts.Items.Add(new ToolStripSeparator());
            ts.Items.Add(Tb("Income Expend", delegate { new IncomeForm().ShowDialog(); RefreshTiles(); }));
            ts.Items.Add(new ToolStripSeparator());
            ts.Items.Add(Tb("Sales Report", delegate { new SalesReportForm().ShowDialog(); }));
            ts.Items.Add(new ToolStripSeparator());
            ts.Items.Add(Tb("Settings", delegate { new SettingsForm().ShowDialog(); }));
            ts.Items.Add(new ToolStripSeparator());
            ts.Items.Add(Tb("Data Folder", delegate { ChangeDir(); }));
            Controls.Add(ts);

            vBills = Tile("দৈনিক বিল", Color.FromArgb(21, 115, 190), 0, 0);
            vSales = Tile("দৈনিক বিক্রয়", Color.FromArgb(9, 133, 96), 1, 0);
            vColl = Tile("দৈনিক জমা", Color.FromArgb(219, 28, 98), 2, 0);
            vDue = Tile("মোট বাকি", Color.FromArgb(159, 28, 28), 0, 1);
            vCust = Tile("মোট গ্রাহক", Color.FromArgb(70, 190, 180), 1, 1);
            vProd = Tile("মোট পণ্য", Color.FromArgb(50, 180, 110), 2, 1);
            lblDir = new Label(); lblDir.SetBounds(30, 380, 880, 40); lblDir.ForeColor = Color.DimGray; Controls.Add(lblDir);
            Activated += delegate { RefreshTiles(); };
            RefreshTiles();
        }

        void RefreshTiles()
        {
            DateTime t = DateTime.Today;
            var inv = Db.Invoices.Where(v => v.Date.Date == t).ToList();
            vBills.Text = inv.Count.ToString();
            vSales.Text = Util.M(inv.Sum(v => v.Sub2));
            vColl.Text = Util.M(inv.Sum(v => v.Paid) + Db.Payments.Where(p => p.Date.Date == t).Sum(p => p.Amount));
            decimal due = 0;
            foreach (Customer c in Db.Customers) { decimal b = Db.Balance(c.Id); if (b > 0) due += b; }
            vDue.Text = Util.M(due);
            vCust.Text = Db.Customers.Count.ToString();
            vProd.Text = Db.Products.Count.ToString();
            lblDir.Text = "ডাটা সংরক্ষিত আছে (লোকাল ড্রাইভ): " + Db.Dir;
        }

        void ChangeDir()
        {
            using (FolderBrowserDialog fb = new FolderBrowserDialog())
            {
                fb.Description = "ডাটা রাখার ফোল্ডার বেছে নিন (পুরাতন ডাটা নতুন ফোল্ডারে কপি হবে)";
                if (fb.ShowDialog() != DialogResult.OK) return;
                string old = Db.Dir;
                string nd = fb.SelectedPath;
                if (!string.Equals(old, nd, StringComparison.OrdinalIgnoreCase))
                {
                    foreach (string f in new string[] { "products.tsv", "customers.tsv", "invoices.tsv", "payments.tsv", "txns.tsv", "shop.txt", "logo.png" })
                    {
                        try
                        {
                            string s = Path.Combine(old, f), d = Path.Combine(nd, f);
                            if (File.Exists(s) && !File.Exists(d)) File.Copy(s, d);
                        }
                        catch { }
                    }
                }
                Db.SetDir(nd);
                RefreshTiles();
            }
        }
    }

    static class Program
    {
        [STAThread]
        static void Main()
        {
            Application.EnableVisualStyles();
            Application.SetCompatibleTextRenderingDefault(false);
            try { Db.Init(); }
            catch (Exception ex) { MessageBox.Show("ডাটা ফোল্ডার তৈরি করা যায়নি: " + ex.Message); return; }
            Application.Run(new MainForm());
        }
    }
}
