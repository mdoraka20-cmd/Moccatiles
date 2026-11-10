টাইলস শপ বিলিং সফটওয়্যার (Invoice + Challan)
==============================================
ইনস্টল: ZIP Extract করে Install.bat-এ ডাবল ক্লিক করুন। Windows-এর নিজস্ব .NET Framework 4 compiler দিয়ে TilesBilling.exe তৈরি হয়ে ইনস্টল হবে, Desktop-এ "Tiles Billing" শর্টকাট আসবে।

প্রথমবার যা করবেন
1. Settings: দোকানের নাম, ঠিকানা, ফোন, Web/Email, Invoice-এর "বিশেষ দ্রষ্টব্য", Prepared by, লোগো দিন।
2. Products: পণ্য যোগ করুন।
   - Product Code + Category দিলে নাম নিজে হয় (যেমন PC 51_A_STC-Glased Rustic Wall)।
   - মাপ (ইঞ্চি) ও Qty Per Pack দিলে SFT Per Pack নিজে হিসাব হয় (8 x 12, 25 পিস = 16.6667 sft)। দরকারে হাতে বদলানো যায়।
   - Tiles / Other (ফিটিংস) বেছে নিন। Other-এর দাম প্রতি পিস।
3. Customer: গ্রাহক যোগ করুন (পুরাতন বাকি থাকলে "পুরাতন বাকি" ঘরে দিন)। চাইলে Order থেকেই নতুন নাম লিখলে গ্রাহক নিজে তৈরি হয়।

বিল করার নিয়ম (Order)
- ডানে "..." চেপে গ্রাহক বাছুন, নাম লিখলেও হয়। Previous Due নিজে আসে।
- পণ্য বাছুন, Box ও Piece দিন: Sft নিজে হিসাব হয়। উল্টোভাবে Sft লিখলে Box ও Piece নিজে বসে (পুরো পিসে উপরের দিকে মিলিয়ে, যেমন 33.33 sft = 2 Box 0 Piece)। Rate/Sft নিজে আসে (বদলানো যায়), Add বা Rate ঘরে Enter চাপুন।
- Labor cost: "Auto round 10" চালু থাকলে মোট টাকা ১০-এর গুণিতকে মিলিয়ে নেয় (যেমন 1266.54 + 3.46 = 1270.00)। বন্ধ করে হাতে লিখতেও পারেন।
- Discount দিন। জমা Cash / Bank / Bkash আলাদা ঘরে দিন (তিনটি মিলিয়েও হতে পারে)। "Full" চাপলে Net Payable থেকে Bank ও Bkash বাদ দিয়ে বাকিটা Cash-এ বসে। Due নিজে হিসাব হয়।
- Save + Invoice Print = বিল (দামসহ, Inword = মোট জমার কথায়, ডানে গোল-কোণা হিসাবের বক্স: Total, Labor Cost, Sub Total, Discount, Previous Due, Net Payable, Cash/Bank/Bkash জমা ও প্রতিবার অবশিষ্ট Net Payable, শেষে Due; পুরো পরিশোধ হলে PAID সিল)
- Save + Challan Print = চালান (দাম ছাড়া, Sft/Box/Piece মোট, Remark ঘর)
- ডানের তালিকায় তারিখ/নাম/মোবাইল দিয়ে খুঁজে Load/Edit, Delete, আবার Invoice/Challan প্রিন্ট করা যায়।

রিপোর্ট (Sales Report বাটন): বাঁয়ে রিপোর্টের তালিকা, তারিখ From/To, Preview চাপলে ডানে প্রিভিউ আসে, Print বাটনে প্রিন্ট।
 1. Daily sales report = Daily Transaction (Pay Recipt + Daily Invoice + Total Cash/Income/Expense/Balance)
 2. Date wise sales  3. Customer wise sales  4. Date and product wise sales
 5. Account type wise sales (নগদ = পূর্ণ পরিশোধ, বাকি = বাকি আছে)
 6. Dealer wise report (Order-এর "Cust. Deal" ঘরের লেখা অনুযায়ী)  7. Product wise sales
 8. Customer wise product list (গ্রাহকের কেনা পণ্যের তালিকা; Customer ফর্মের "Product List" বাটন থেকেও খোলে)
Income Expend বাটনে আয়/খরচ এন্ট্রি দিন, Daily Transaction-এ যোগ-বিয়োগ হবে।

অন্যান্য: Pay Receipt (বাকি জমা Cash/Bank/Bkash মাধ্যমসহ + মানি রিসিট), Due List (CSV Export), Dashboard (দৈনিক বিল, বিক্রয়, জমা, মোট বাকি)।

ডাটা: D:\TilesBillingData (D: না থাকলে C:\TilesBillingData)। "Data Folder" বাটনে অন্য ড্রাইভ/পেনড্রাইভ বেছে নেওয়া যায়। ব্যাকআপ = এই ফোল্ডার কপি। ফাইল: products.tsv, customers.tsv, invoices.tsv, payments.tsv, shop.txt, logo.png।

নোট: প্রিন্ট প্রিভিউ চালাতে Windows-এ একটি প্রিন্টার (এমনকি Microsoft Print to PDF) ইনস্টল থাকতে হবে। সংখ্যা ইংরেজি বা বাংলা দুই ভাবেই লেখা যায়।
Install.bat-এ "BUILD FAILED" এলে error লেখাটা পাঠান।

Settings-এ "বিশেষ দ্রষ্টব্য" ঘরে একাধিক লাইন লেখা যায় (যেমন সাপ্তাহিক বন্ধ আলাদা লাইনে) এবং "ফুটার লেখা" ঘরের লেখা প্রতিটি বিলের একদম নিচে ছাপা হয়।
Daily Transaction রিপোর্টে "Received By" টেবিলে Cash/Bank/Bkash আলাদা মোট দেখায়।
