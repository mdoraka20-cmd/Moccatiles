Imports System
Imports System.Collections.Generic
Imports System.Drawing
Imports System.Drawing.Drawing2D
Imports System.Drawing.Printing
Imports System.Globalization
Imports System.IO
Imports System.Linq
Imports System.Text
Imports System.Windows.Forms

Namespace InventoryBilling

    ' ===================== MODELS =====================
    Public Class Product
        Public Id As Integer
        Public Code As String = ""
        Public Category As String = ""
        Public Name As String = ""
        Public IsTile As Boolean = True
        Public W As Decimal
        Public H As Decimal
        Public Scm As Decimal
        Public SftPack As Decimal
        Public QtyPack As Decimal
        Public Rate As Decimal
        Public Price As Decimal
        Public StockBox As Decimal
        Public StockPiece As Decimal
        Public StockSft As Decimal
    End Class

    Public Class Dealer
        Public Id As Integer
        Public Name As String = ""
        Public Phone As String = ""
        Public Address As String = ""
        Public Note As String = ""
    End Class

    Public Class AppUser
        Public Id As String = ""
        Public Username As String = ""
        Public Name As String = ""
        Public Role As String = "staff" ' admin or staff
        Public Password As String = ""
        Public Phone As String = ""
    End Class

    Public Class StockInItem
        Public ProductId As Integer
        Public Name As String = ""
        Public Box As Decimal
        Public Piece As Decimal
        Public Sft As Decimal
        Public Rate As Decimal
        Public Total As Decimal
    End Class

    Public Class StockInRecord
        Public Id As Integer
        Public VendorName As String = ""
        Public VendorChallanNo As String = ""
        Public ReferenceNo As String = ""
        Public [Date] As DateTime
        Public Note As String = ""
        Public Items As New List(Of StockInItem)()
        Public TotalAmount As Decimal
    End Class

    Public Class DeliveryItem
        Public ProductId As Integer
        Public Name As String = ""
        Public Box As Decimal
        Public Piece As Decimal
        Public Sft As Decimal
    End Class

    Public Class DeliveryChallan
        Public Id As Integer
        Public ChallanNo As String = ""
        Public InvoiceNo As Long
        Public CustName As String = ""
        Public Deal As String = ""
        Public [Date] As DateTime
        Public VehicleNo As String = ""
        Public DriverName As String = ""
        Public DriverPhone As String = ""
        Public Items As New List(Of DeliveryItem)()
    End Class

    Public Class Customer
        Public Id As Integer
        Public Name As String = ""
        Public Address As String = ""
        Public Phone As String = ""
        Public Deal As String = ""
        Public OpenDue As Decimal
    End Class

    Public Class Item
        Public ProductId As Integer
        Public Name As String = ""
        Public Dim As String = ""
        Public Box As Decimal
        Public Piece As Decimal
        Public Sft As Decimal
        Public Unit As Decimal
        Public Total As Decimal
        Public IsTile As Boolean = True
    End Class

    Public Class Payment
        Public Id As Integer
        Public [Date] As DateTime
        Public CustId As Integer
        Public CustName As String = ""
        Public Amount As Decimal
        Public Remark As String = ""
        Public Method As String = "Cash"
    End Class

    Public Class Invoice
        Public No As Long
        Public [Date] As DateTime
        Public CustId As Integer
        Public CustName As String = ""
        Public Address As String = ""
        Public Phone As String = ""
        Public Deal As String = ""
        Public Comment As String = ""
        Public Labor As Decimal
        Public Discount As Decimal
        Public PrevDue As Decimal
        Public Cash As Decimal
        Public Bank As Decimal
        Public Bkash As Decimal
        Public DeliveryStatus As String = "pending"

        Public ReadOnly Property Paid As Decimal
            Get
                Return Cash + Bank + Bkash
            End Get
        End Property

        Public Items As New List(Of Item)()

        Public ReadOnly Property LineSum As Decimal
            Get
                Return Items.Sum(Function(i) i.Total)
            End Get
        End Property

        Public ReadOnly Property Sub1 As Decimal
            Get
                Return LineSum + Labor
            End Get
        End Property

        Public ReadOnly Property Sub2 As Decimal
            Get
                Return Sub1 - Discount
            End Get
        End Property

        Public ReadOnly Property Net As Decimal
            Get
                Return Sub2 + PrevDue
            End Get
        End Property

        Public ReadOnly Property Due As Decimal
            Get
                Return Net - Paid
            End Get
        End Property
    End Class

    Public Class Txn
        Public Id As Integer
        Public [Date] As DateTime
        Public IsIncome As Boolean
        Public Head As String = ""
        Public Amount As Decimal
    End Class

    ' ===================== UTIL =====================
    Public Module Util
        Public Function Num(s As String) As Decimal
            If s Is Nothing Then Return 0D
            Dim sb As New StringBuilder()
            For Each c As Char In s
                If c >= ChrW(&H09E6) AndAlso c <= ChrW(&H09EF) Then
                    sb.Append(ChrW(AscW("0"c) + (AscW(c) - &H09E6)))
                ElseIf c <> ","c AndAlso c <> " "c Then
                    sb.Append(c)
                End If
            Next
            Dim d As Decimal
            If Decimal.TryParse(sb.ToString(), NumberStyles.Any, CultureInfo.InvariantCulture, d) Then
                Return d
            End If
            Return 0D
        End Function

        Public Function M(d As Decimal) As String
            Return d.ToString("N2", CultureInfo.InvariantCulture)
        End Function

        Public Function Q(d As Decimal) As String
            Return d.ToString("0.##", CultureInfo.InvariantCulture)
        End Function

        Public Function Q4(d As Decimal) As String
            Return d.ToString("0.####", CultureInfo.InvariantCulture)
        End Function

        Private ReadOnly Ones As String() = {"", "ONE", "TWO", "THREE", "FOUR", "FIVE", "SIX", "SEVEN", "EIGHT", "NINE", "TEN", "ELEVEN", "TWELVE", "THIRTEEN", "FOURTEEN", "FIFTEEN", "SIXTEEN", "SEVENTEEN", "EIGHTEEN", "NINETEEN"}
        Private ReadOnly Tens As String() = {"", "", "TWENTY", "THIRTY", "FORTY", "FIFTY", "SIXTY", "SEVENTY", "EIGHTY", "NINETY"}

        Private Function B100(n As Integer) As String
            If n < 20 Then Return Ones(n)
            Return (Tens(n \ 10) & " " & Ones(n Mod 10)).Trim()
        End Function

        Private Function B1000(n As Integer) As String
            Dim s As String = ""
            If n >= 100 Then s = Ones(n \ 100) & " HUNDRED"
            If (n Mod 100) > 0 Then
                s &= If(s.Length > 0, " ", "") & B100(n Mod 100)
            End If
            Return s
        End Function

        Public Function Words(n As Long) As String
            If n = 0 Then Return "ZERO"
            If n < 0 Then Return "MINUS " & Words(-n)
            Dim s As String = ""
            Dim cr As Long = n \ 10000000L
            n = n Mod 10000000L
            Dim lk As Long = n \ 100000L
            n = n Mod 100000L
            Dim th As Long = n \ 1000L
            n = n Mod 1000L
            If cr > 0 Then s &= Words(cr) & " CRORE "
            If lk > 0 Then s &= B100(CInt(lk)) & " LAKH "
            If th > 0 Then s &= B100(CInt(th)) & " THOUSAND "
            If n > 0 Then s &= B1000(CInt(n))
            Return s.Trim()
        End Function

        Public Function InWords(amt As Decimal) As String
            amt = Math.Round(amt, 2)
            Dim a As Decimal = Math.Abs(amt)
            Dim whole As Long = CLng(Math.Floor(a))
            Dim paisa As Integer = CInt(Math.Round((a - CDec(whole)) * 100D))
            Dim s As String = Words(whole)
            If paisa > 0 Then s &= " AND " & Words(paisa) & " PAISA"
            If amt < 0 Then s = "MINUS " & s
            Return s & " ONLY"
        End Function
    End Module

    ' ===================== DATA =====================
    Public Module Db
        Public Dir As String = ""
        Public Products As New List(Of Product)()
        Public Customers As New List(Of Customer)()
        Public Invoices As New List(Of Invoice)()
        Public Payments As New List(Of Payment)()
        Public Txns As New List(Of Txn)()
        ' 0 name, 1 address, 2 phones, 3 web, 4 note, 5 prepared by, 6 start invoice no, 7 footer text
        Public Shop As String() = New String(7) {}
        Private ReadOnly Inv As CultureInfo = CultureInfo.InvariantCulture
        Private ReadOnly Cfg As String = Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.ApplicationData), "InventoryBilling.cfg")
        Private Const DT As String = "yyyy-MM-dd HH:mm:ss"

        Public Sub Init()
            Dim d As String = ""
            Try
                If File.Exists(Cfg) Then d = File.ReadAllText(Cfg, Encoding.UTF8).Trim()
            Catch
            End Try
            If d.Length = 0 Then
                d = If(Directory.Exists("D:\"), "D:\InventoryBillingData", "C:\InventoryBillingData")
            End If
            SetDir(d)
        End Sub

        Public Sub SetDir(d As String)
            Try
                Directory.CreateDirectory(d)
            Catch
                d = Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.MyDocuments), "InventoryBillingData")
                Directory.CreateDirectory(d)
            End Try
            Dir = d
            Try
                File.WriteAllText(Cfg, d, Encoding.UTF8)
            Catch
            End Try
            LoadAll()
        End Sub

        Public Function P(f As String) As String
            Return Path.Combine(Dir, f)
        End Function

        Private Function Cl(s As String) As String
            If s Is Nothing Then Return ""
            Return s.Replace(vbTab, " ").Replace(vbCr, " ").Replace(vbLf, " ").Replace("|", " ").Replace("~", " ").Trim()
        End Function

        Private Function N(d As Decimal) As String
            Return d.ToString(Inv)
        End Function

        Private Function D(s As String) As Decimal
            Dim r As Decimal
            Decimal.TryParse(s, NumberStyles.Any, Inv, r)
            Return r
        End Function

        Private Function Rd(f As String) As String()
            Dim pth As String = P(f)
            Return If(File.Exists(pth), File.ReadAllLines(pth, Encoding.UTF8), New String() {})
        End Function

        Private Sub Wr(f As String, lines As List(Of String))
            Dim pth As String = P(f)
            Dim tmp As String = pth & ".tmp"
            File.WriteAllLines(tmp, lines.ToArray(), Encoding.UTF8)
            File.Copy(tmp, pth, True)
            File.Delete(tmp)
        End Sub

        Public Sub LoadAll()
            Shop = New String() {
                "মেসার্স সততা টাইলস ও স্যানিটারি",
                "মেইন রোড, ঢাকা",
                "০১৭১২-৩৪৫৬৭৮, ০১৮১২-৩৪৫৬৭৮",
                "Email: info@shop.com | Web: www.shop.com",
                "বিশেষ দ্রষ্টব্য : ভেজা, সিমেন্ট লাগানো, চায়না টাইলস এবং ২ মাসের অতিরিক্ত সময় হলে যে কোন টাইলস ফেরৎ যোগ্য নহে।" & vbCrLf & "সাপ্তাহিক বন্ধ : শুক্রবার",
                "মোঃ রফিকুল ইসলাম",
                "",
                "আমাদের সেবায় সন্তুষ্ট থাকলে আবার আসবেন। ধন্যবাদ।"
            }
            Dim sl As String() = Rd("shop.txt")
            For i As Integer = 0 To Math.Min(7, sl.Length - 1)
                Shop(i) = sl(i).Replace("\n", vbCrLf)
            Next

            Products.Clear()
            Customers.Clear()
            Invoices.Clear()
            Payments.Clear()
            Txns.Clear()

            For Each line As String In Rd("products.tsv")
                Try
                    Dim parts As String() = line.Split(ControlChars.Tab)
                    If parts.Length < 12 Then Continue For
                    Dim x As New Product() With {
                        .Id = Integer.Parse(parts(0)),
                        .Code = parts(1),
                        .Category = parts(2),
                        .Name = parts(3),
                        .IsTile = (parts(4) = "1"),
                        .W = D(parts(5)),
                        .H = D(parts(6)),
                        .Scm = D(parts(7)),
                        .SftPack = D(parts(8)),
                        .QtyPack = D(parts(9)),
                        .Rate = D(parts(10)),
                        .Price = D(parts(11))
                    }
                    Products.Add(x)
                Catch
                End Try
            Next

            For Each line As String In Rd("customers.tsv")
                Try
                    Dim parts As String() = line.Split(ControlChars.Tab)
                    If parts.Length < 6 Then Continue For
                    Dim c As New Customer() With {
                        .Id = Integer.Parse(parts(0)),
                        .Name = parts(1),
                        .Address = parts(2),
                        .Phone = parts(3),
                        .Deal = parts(4),
                        .OpenDue = D(parts(5))
                    }
                    Customers.Add(c)
                Catch
                End Try
            Next

            For Each line As String In Rd("payments.tsv")
                Try
                    Dim parts As String() = line.Split(ControlChars.Tab)
                    If parts.Length < 6 Then Continue For
                    Dim x As New Payment() With {
                        .Id = Integer.Parse(parts(0)),
                        .[Date] = DateTime.ParseExact(parts(1), DT, Inv),
                        .CustId = Integer.Parse(parts(2)),
                        .CustName = parts(3),
                        .Amount = D(parts(4)),
                        .Remark = parts(5)
                    }
                    If parts.Length > 6 AndAlso parts(6).Length > 0 Then x.Method = parts(6)
                    Payments.Add(x)
                Catch
                End Try
            Next

            For Each line As String In Rd("txns.tsv")
                Try
                    Dim parts As String() = line.Split(ControlChars.Tab)
                    If parts.Length < 5 Then Continue For
                    Dim x As New Txn() With {
                        .Id = Integer.Parse(parts(0)),
                        .[Date] = DateTime.ParseExact(parts(1), DT, Inv),
                        .IsIncome = (parts(2) = "1"),
                        .Head = parts(3),
                        .Amount = D(parts(4))
                    }
                    Txns.Add(x)
                Catch
                End Try
            Next

            For Each line As String In Rd("invoices.tsv")
                Try
                    Dim parts As String() = line.Split(ControlChars.Tab)
                    If parts.Length < 13 Then Continue For
                    Dim v As New Invoice() With {
                        .No = Long.Parse(parts(0)),
                        .[Date] = DateTime.ParseExact(parts(1), DT, Inv),
                        .CustId = Integer.Parse(parts(2)),
                        .CustName = parts(3),
                        .Address = parts(4),
                        .Phone = parts(5),
                        .Deal = parts(6),
                        .Labor = D(parts(7)),
                        .Discount = D(parts(8)),
                        .PrevDue = D(parts(9)),
                        .Cash = D(parts(10)),
                        .Comment = parts(11)
                    }
                    If parts.Length > 13 Then v.Bank = D(parts(13))
                    If parts.Length > 14 Then v.Bkash = D(parts(14))
                    If parts(12).Length > 0 Then
                        For Each it As String In parts(12).Split("|"c)
                            Dim f As String() = it.Split("~"c)
                            If f.Length < 9 Then Continue For
                            Dim m As New Item() With {
                                .ProductId = Integer.Parse(f(0)),
                                .Name = f(1),
                                .Dim = f(2),
                                .Box = D(f(3)),
                                .Piece = D(f(4)),
                                .Sft = D(f(5)),
                                .Unit = D(f(6)),
                                .Total = D(f(7)),
                                .IsTile = (f(8) = "1")
                            }
                            v.Items.Add(m)
                        Next
                    End If
                    Invoices.Add(v)
                Catch
                End Try
            Next
        End Sub

        Public Sub SaveShop()
            Dim l As New List(Of String)()
            For Each s As String In Shop
                Dim str As String = If(s, "").Replace(vbTab, " ").Replace(vbCrLf, "\n").Replace(vbLf, "\n").Replace(vbCr, " ").Trim()
                l.Add(str)
            Next
            Wr("shop.txt", l)
        End Sub

        Public Sub SaveProducts()
            Dim l As New List(Of String)()
            For Each x As Product In Products
                l.Add(String.Join(vbTab, New String() {x.Id.ToString(), Cl(x.Code), Cl(x.Category), Cl(x.Name), If(x.IsTile, "1", "0"), N(x.W), N(x.H), N(x.Scm), N(x.SftPack), N(x.QtyPack), N(x.Rate), N(x.Price)}))
            Next
            Wr("products.tsv", l)
        End Sub

        Public Sub SaveCustomers()
            Dim l As New List(Of String)()
            For Each c As Customer In Customers
                l.Add(String.Join(vbTab, New String() {c.Id.ToString(), Cl(c.Name), Cl(c.Address), Cl(c.Phone), Cl(c.Deal), N(c.OpenDue)}))
            Next
            Wr("customers.tsv", l)
        End Sub

        Public Sub SavePayments()
            Dim l As New List(Of String)()
            For Each x As Payment In Payments
                l.Add(String.Join(vbTab, New String() {x.Id.ToString(), x.[Date].ToString(DT, Inv), x.CustId.ToString(), Cl(x.CustName), N(x.Amount), Cl(x.Remark), Cl(x.Method)}))
            Next
            Wr("payments.tsv", l)
        End Sub

        Public Sub SaveInvoices()
            Dim l As New List(Of String)()
            For Each v As Invoice In Invoices
                Dim items As String = String.Join("|", v.Items.[Select](Function(m) m.ProductId & "~" & Cl(m.Name) & "~" & Cl(m.Dim) & "~" & N(m.Box) & "~" & N(m.Piece) & "~" & N(m.Sft) & "~" & N(m.Unit) & "~" & N(m.Total) & "~" & If(m.IsTile, "1", "0")).ToArray())
                l.Add(String.Join(vbTab, New String() {v.No.ToString(), v.[Date].ToString(DT, Inv), v.CustId.ToString(), Cl(v.CustName), Cl(v.Address), Cl(v.Phone), Cl(v.Deal), N(v.Labor), N(v.Discount), N(v.PrevDue), N(v.Cash), Cl(v.Comment), items, N(v.Bank), N(v.Bkash)}))
            Next
            Wr("invoices.tsv", l)
        End Sub

        Public Sub SaveTxns()
            Dim l As New List(Of String)()
            For Each x As Txn In Txns
                l.Add(String.Join(vbTab, New String() {x.Id.ToString(), x.[Date].ToString(DT, Inv), If(x.IsIncome, "1", "0"), Cl(x.Head), N(x.Amount)}))
            Next
            Wr("txns.tsv", l)
        End Sub

        Public Function NextTxnId() As Integer
            Return If(Txns.Count = 0, 1, Txns.Max(Function(x) x.Id) + 1)
        End Function

        Public Function NextProductId() As Integer
            Return If(Products.Count = 0, 3010001, Products.Max(Function(x) x.Id) + 1)
        End Function

        Public Function NextCustId() As Integer
            Return If(Customers.Count = 0, 4000001, Customers.Max(Function(x) x.Id) + 1)
        End Function

        Public Function NextPayId() As Integer
            Return If(Payments.Count = 0, 1, Payments.Max(Function(x) x.Id) + 1)
        End Function

        Public Function NextInvoiceNo() As Long
            If Invoices.Count > 0 Then Return Invoices.Max(Function(x) x.No) + 1L
            Dim s As Long
            If Long.TryParse(Shop(6), s) AndAlso s > 0 Then Return s
            Return (DateTime.Now.Year Mod 100) * 100000L + 1L
        End Function

        Public Function Balance(custId As Integer) As Decimal
            Dim c As Customer = Customers.FirstOrDefault(Function(x) x.Id = custId)
            Dim b As Decimal = If(c Is Nothing, 0D, c.OpenDue)
            For Each v As Invoice In Invoices
                If v.CustId = custId Then b += (v.Sub2 - v.Paid)
            Next
            For Each p As Payment In Payments
                If p.CustId = custId Then b -= p.Amount
            Next
            Return b
        End Function
    End Module

    ' ===================== PROGRAM ENTRY POINT =====================
    Public Class Program
        <STAThread>
        Public Shared Sub Main()
            Application.EnableVisualStyles()
            Application.SetCompatibleTextRenderingDefault(False)
            Try
                Db.Init()
            Catch ex As Exception
                MessageBox.Show("ডাটা ফোল্ডার তৈরি করা যায়নি: " & ex.Message)
                Return
            End Try
            ' MainForm starts here
            MessageBox.Show("Inventory Billing App (VB.NET Edition) - Welcome!")
        End Sub
    End Class

End Namespace
