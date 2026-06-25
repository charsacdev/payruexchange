/* =========================================================
   PayRu — Mock Database (localStorage)
   Simulates a backend for the prototype. No real crypto or
   banking integrations — everything is local & simulated.
   ========================================================= */

(function (global) {
  const STORAGE_KEY = "payru_db_v2";
  const SESSION_KEY = "payru_session";

  /* ---------- Reference data ---------- */
  const ASSETS = {
    BTC: { symbol: "BTC", name: "Bitcoin", glyph: "₿", color: "#F7931A", price: 97500, network: "Bitcoin Network (BTC)", address: "bc1qar0srrr7xfkvy5l643lydnw9re59gtzzwf5mdq" },
    ETH: { symbol: "ETH", name: "Ethereum", glyph: "Ξ", color: "#627EEA", price: 3450, network: "Ethereum (ERC-20)", address: "0x71C7656EC7ab88b098defB751B7401B5f6d8976F" },
    USDT: { symbol: "USDT", name: "Tether USD", glyph: "₮", color: "#26A17B", price: 1, network: "Tron (TRC-20)", address: "TPL66VK2gCXNCD7tNQy7faZAR2VfqHfDzS" },
    BNB: { symbol: "BNB", name: "BNB", glyph: "B", color: "#F0B90B", price: 640, network: "BNB Smart Chain (BEP-20)", address: "0x4B0897b0513fdc7C541B6d9D7E929C4e5364D2dB" },
    USDC: { symbol: "USDC", name: "USD Coin", glyph: "$", color: "#2775CA", price: 1, network: "Ethereum (ERC-20)", address: "0x8f306C8c6F8e2c5Ea6e3F2dA8B5b6A2C4d12dE56" },
  };

  const DEFAULT_BUY_RATE = 1650; // NGN per USD — rate users pay when buying crypto
  const DEFAULT_SELL_RATE = 1600; // NGN per USD — rate users receive when selling crypto

  const KYC_TYPES = {
    nin: "National ID Number (NIN)",
    voters_card: "Voter's Card (PVC)",
    drivers_license: "Driver's License",
    passport: "International Passport",
  };

  const NIGERIAN_BANKS = [
    "Access Bank", "Citibank Nigeria", "Ecobank Nigeria", "Fidelity Bank",
    "First Bank of Nigeria", "First City Monument Bank (FCMB)", "Globus Bank",
    "Guaranty Trust Bank (GTBank)", "Heritage Bank", "Keystone Bank",
    "Kuda Microfinance Bank", "Moniepoint MFB", "Opay", "Palmpay",
    "Polaris Bank", "Providus Bank", "Stanbic IBTC Bank", "Standard Chartered Bank",
    "Sterling Bank", "Union Bank of Nigeria", "United Bank for Africa (UBA)",
    "Unity Bank", "Wema Bank", "Zenith Bank",
  ];

  // The platform's own bank account — users pay into this account when buying crypto.
  const PLATFORM_BANK_ACCOUNT = {
    bankName: "Guaranty Trust Bank (GTBank)",
    accountNumber: "0244780055",
    accountName: "PayRu Limited",
  };

  /* ---------- Bulk seed reference data (for generating demo users/transactions) ---------- */
  const SEED_FIRST_NAMES = [
    "Chinedu", "Ngozi", "Tunde", "Funke", "Emeka", "Aisha", "Bolanle", "Chioma", "Damilola", "Efe",
    "Fatima", "Gbenga", "Halima", "Ibrahim", "Joy", "Kemi", "Lawal", "Maryam", "Nneka", "Obinna",
    "Patience", "Queeneth", "Rasheed", "Sade", "Tobi", "Uche", "Victor", "Wendy", "Yemi", "Zainab",
    "Adeola", "Bukola", "Chukwudi", "Damilare", "Esther", "Folake", "Grace", "Hassan", "Ifeoma", "John",
    "Kunle", "Lola", "Mohammed", "Nkechi", "Olamide", "Pius", "Rita", "Segun", "Tope", "Usman",
  ];

  const SEED_LAST_NAMES = [
    "Okafor", "Adeyemi", "Balogun", "Chukwu", "Danjuma", "Eze", "Fashola", "Gbadamosi", "Hassan", "Ibekwe",
    "Jibrin", "Kalu", "Lawal", "Mohammed", "Nwosu", "Obi", "Okonjo", "Oyelaran", "Peters", "Quadri",
    "Raji", "Sani", "Taiwo", "Udom", "Vincent", "Wahab", "Yakubu", "Zubair", "Adebayo", "Bello",
    "Chidi", "Dauda", "Effiong", "Folarin", "Garba", "Hussaini", "Igwe", "Jegede", "Kuti", "Lamidi",
  ];

  const SEED_CITIES = [
    { city: "Lagos", state: "Lagos" },
    { city: "Abuja", state: "FCT" },
    { city: "Port Harcourt", state: "Rivers" },
    { city: "Ibadan", state: "Oyo" },
    { city: "Kano", state: "Kano" },
    { city: "Enugu", state: "Enugu" },
    { city: "Benin City", state: "Edo" },
    { city: "Kaduna", state: "Kaduna" },
    { city: "Abeokuta", state: "Ogun" },
    { city: "Calabar", state: "Cross River" },
  ];

  const SEED_EMAIL_DOMAINS = ["gmail.com", "yahoo.com", "outlook.com"];
  const SEED_PHONE_PREFIXES = ["701", "702", "703", "705", "706", "707", "708", "802", "803", "805", "806", "807", "808", "809", "810", "811", "812", "813", "814", "815", "816", "817", "818", "901", "902", "903", "904", "905", "906", "907", "908", "909"];

  const SEED_DEVICES = [
    "Chrome on Windows", "Chrome on Android", "Safari on iPhone", "Safari on Mac",
    "Edge on Windows", "Firefox on Windows", "Chrome on Mac", "Samsung Internet on Android",
  ];
  const SEED_IP_PREFIXES = [41, 62, 105, 154, 196, 197];

  /* ---------- Helpers ---------- */
  function uid(prefix) {
    return `${prefix}_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;
  }

  function hashPassword(pw) {
    // Lightweight obfuscation for the demo — not real cryptography.
    let hash = 0;
    for (let i = 0; i < pw.length; i++) {
      hash = (hash << 5) - hash + pw.charCodeAt(i);
      hash |= 0;
    }
    return `h${hash}_${pw.length}`;
  }

  function nowISO() {
    return new Date().toISOString();
  }

  // Deterministic 10-digit virtual account number derived from the user's ID,
  // so it stays stable across reloads without needing to persist a counter.
  function generateVirtualAccountNumber(userId) {
    let hash = 0;
    for (let i = 0; i < userId.length; i++) {
      hash = (hash * 31 + userId.charCodeAt(i)) >>> 0;
    }
    return "90" + String(hash % 100000000).padStart(8, "0");
  }

  function buildVirtualAccount(user) {
    return {
      bankName: "Providus Bank",
      accountNumber: generateVirtualAccountNumber(user.id),
      accountName: `PayRu - ${user.firstName} ${user.lastName}`,
    };
  }

  /* ---------- Random data helpers (for bulk seed generation) ---------- */
  function randomInt(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }

  function randomItem(arr) {
    return arr[randomInt(0, arr.length - 1)];
  }

  function randomDigits(length) {
    let s = "";
    for (let i = 0; i < length; i++) s += randomInt(0, 9);
    return s;
  }

  function randomHex(length) {
    const chars = "0123456789abcdef";
    let s = "";
    for (let i = 0; i < length; i++) s += chars[randomInt(0, chars.length - 1)];
    return s;
  }

  function randomAlnum(length) {
    const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz123456789";
    let s = "";
    for (let i = 0; i < length; i++) s += chars[randomInt(0, chars.length - 1)];
    return s;
  }

  function randomWalletAddress(asset) {
    if (asset === "BTC") return "bc1q" + randomHex(38);
    if (asset === "USDT") return "T" + randomAlnum(33);
    return "0x" + randomHex(40);
  }

  function randomIPv4() {
    const first = randomItem(SEED_IP_PREFIXES);
    return `${first}.${randomInt(0, 255)}.${randomInt(0, 255)}.${randomInt(1, 254)}`;
  }

  function randomLastLogin(location) {
    return {
      ip: randomIPv4(),
      location: `${location.city}, ${location.state}, Nigeria`,
      device: randomItem(SEED_DEVICES),
      at: daysAgoISO(randomInt(0, 6), randomInt(0, 23)),
    };
  }

  // Extra transaction history for the demo account, so its transaction
  // tables have more than a handful of rows to page through.
  function buildExtraDemoTransactions(demo) {
    const demoId = demo.id;
    return [
      {
        id: uid("txn"), userId: demoId, type: "buy", asset: "ETH", amountUSD: 300,
        rate: DEFAULT_BUY_RATE, amountNGN: 300 * DEFAULT_BUY_RATE, status: "completed",
        platformBankAccount: PLATFORM_BANK_ACCOUNT, walletAddress: randomWalletAddress("ETH"),
        createdAt: daysAgoISO(45), updatedAt: daysAgoISO(44),
      },
      {
        id: uid("txn"), userId: demoId, type: "sell", asset: "USDC", amountUSD: 250,
        rate: DEFAULT_SELL_RATE, amountNGN: 250 * DEFAULT_SELL_RATE, status: "completed",
        depositAddress: ASSETS.USDC.address, bankAccount: demo.bankAccount,
        createdAt: daysAgoISO(38), updatedAt: daysAgoISO(37),
      },
      {
        id: uid("txn"), userId: demoId, type: "buy", asset: "BNB", amountUSD: 200,
        rate: DEFAULT_BUY_RATE, amountNGN: 200 * DEFAULT_BUY_RATE, status: "completed",
        platformBankAccount: PLATFORM_BANK_ACCOUNT, walletAddress: randomWalletAddress("BNB"),
        createdAt: daysAgoISO(30), updatedAt: daysAgoISO(29),
      },
      {
        id: uid("txn"), userId: demoId, type: "sell", asset: "BTC", amountUSD: 500,
        rate: DEFAULT_SELL_RATE, amountNGN: 500 * DEFAULT_SELL_RATE, status: "cancelled",
        depositAddress: ASSETS.BTC.address, bankAccount: null,
        createdAt: daysAgoISO(25), updatedAt: daysAgoISO(25),
      },
      {
        id: uid("txn"), userId: demoId, type: "buy", asset: "USDT", amountUSD: 1000,
        rate: DEFAULT_BUY_RATE, amountNGN: 1000 * DEFAULT_BUY_RATE, status: "completed",
        platformBankAccount: PLATFORM_BANK_ACCOUNT, walletAddress: randomWalletAddress("USDT"),
        createdAt: daysAgoISO(20), updatedAt: daysAgoISO(19),
      },
      {
        id: uid("txn"), userId: demoId, type: "sell", asset: "ETH", amountUSD: 220,
        rate: DEFAULT_SELL_RATE, amountNGN: 220 * DEFAULT_SELL_RATE, status: "completed",
        depositAddress: ASSETS.ETH.address, bankAccount: demo.bankAccount,
        createdAt: daysAgoISO(15), updatedAt: daysAgoISO(14),
      },
      {
        id: uid("txn"), userId: demoId, type: "buy", asset: "BTC", amountUSD: 800,
        rate: DEFAULT_BUY_RATE, amountNGN: 800 * DEFAULT_BUY_RATE, status: "processing_crypto_payout",
        platformBankAccount: PLATFORM_BANK_ACCOUNT, walletAddress: randomWalletAddress("BTC"),
        createdAt: daysAgoISO(10), updatedAt: daysAgoISO(9),
      },
      {
        id: uid("txn"), userId: demoId, type: "sell", asset: "BNB", amountUSD: 180,
        rate: DEFAULT_SELL_RATE, amountNGN: 180 * DEFAULT_SELL_RATE, status: "processing_payout",
        depositAddress: ASSETS.BNB.address, bankAccount: demo.bankAccount,
        createdAt: daysAgoISO(7), updatedAt: daysAgoISO(6),
      },
      {
        id: uid("txn"), userId: demoId, type: "buy", asset: "USDC", amountUSD: 350,
        rate: DEFAULT_BUY_RATE, amountNGN: 350 * DEFAULT_BUY_RATE, status: "pending_payment",
        platformBankAccount: PLATFORM_BANK_ACCOUNT, walletAddress: randomWalletAddress("USDC"),
        createdAt: daysAgoISO(4), updatedAt: daysAgoISO(4),
      },
      {
        id: uid("txn"), userId: demoId, type: "sell", asset: "USDT", amountUSD: 600,
        rate: DEFAULT_SELL_RATE, amountNGN: 600 * DEFAULT_SELL_RATE, status: "completed",
        depositAddress: ASSETS.USDT.address, bankAccount: demo.bankAccount,
        createdAt: daysAgoISO(1), updatedAt: daysAgoISO(1),
      },
    ];
  }

  function daysAgoISO(days, extraHours = 0) {
    return new Date(Date.now() - days * 86400000 - extraHours * 3600000).toISOString();
  }

  // Payout bank accounts must be held in the verified user's own name, so
  // compare against both name orderings ("First Last" and "Last First").
  function accountNameMatches(user, accountName) {
    const normalize = (s) => (s || "").trim().toLowerCase().replace(/\s+/g, " ");
    const input = normalize(accountName);
    const forward = normalize(`${user.firstName} ${user.lastName}`);
    const reversed = normalize(`${user.lastName} ${user.firstName}`);
    return input === forward || input === reversed;
  }

  function load() {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      const seeded = seed();
      save(seeded);
      return seeded;
    }
    try {
      const db = JSON.parse(raw);
      return migrate(db);
    } catch (e) {
      const seeded = seed();
      save(seeded);
      return seeded;
    }
  }

  // Backfill fields added after a user's record was first saved, so
  // existing localStorage data keeps working without a full reset.
  function migrate(db) {
    let changed = false;
    if (!db.derivSettings) {
      db.derivSettings = { companyCR: "CR9001234", paymentID: "PAY-PAYRU-001" };
      changed = true;
    }
    if (!db.derivTransactions) {
      db.derivTransactions = [];
      changed = true;
    }
    // Fix admin email if it still has the old PayruExchange domain
    const admin = db.users.find((u) => u.role === "admin");
    if (admin && admin.email && admin.email.toLowerCase().includes("payruexchange")) {
      admin.email = "admin@PayRu.com";
      changed = true;
    }
    db.users.forEach((user) => {
      if (!user.virtualAccount) {
        user.virtualAccount = buildVirtualAccount(user);
        changed = true;
      }
      if (!user.lastLogin) {
        const location = user.kyc && user.kyc.city
          ? { city: user.kyc.city, state: user.kyc.state }
          : { city: "Lagos", state: "Lagos" };
        user.lastLogin = randomLastLogin(location);
        changed = true;
      }
    });
    if (!db.settings) {
      db.settings = { buyRate: DEFAULT_BUY_RATE, sellRate: DEFAULT_SELL_RATE, derivRate: 1580 };
      changed = true;
    } else if (!db.settings.derivRate) {
      db.settings.derivRate = 1580;
      changed = true;
    }
    const demoUser = db.users.find((u) => u.id === "usr_demo0001");
    if (demoUser) {
      const demoTxnCount = db.transactions.filter((t) => t.userId === demoUser.id).length;
      if (demoTxnCount < 13) {
        db.transactions.push(...buildExtraDemoTransactions(demoUser));
        changed = true;
      }
    }
    if (changed) save(db);
    return db;
  }

  function save(db) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(db));
  }

  /* ---------- Bulk demo data (~100 users with KYC, deposits & withdrawals) ---------- */
  function generateBulkSeedData() {
    const users = [];
    const transactions = [];
    const assetSymbols = Object.keys(ASSETS);
    const idTypeKeys = Object.keys(KYC_TYPES);
    const streets = ["Adeola Odeku St", "Awolowo Rd", "Allen Ave", "Ikorodu Rd", "Ahmadu Bello Way", "Ozumba Mbadiwe Ave", "Constitution Ave", "Aba Rd", "Ring Rd", "Marina St"];

    for (let i = 0; i < 100; i++) {
      const firstName = SEED_FIRST_NAMES[i % SEED_FIRST_NAMES.length];
      const lastName = SEED_LAST_NAMES[(i + 13) % SEED_LAST_NAMES.length];
      const location = SEED_CITIES[i % SEED_CITIES.length];
      const domain = SEED_EMAIL_DOMAINS[i % SEED_EMAIL_DOMAINS.length];
      const email = `${firstName.toLowerCase()}.${lastName.toLowerCase()}${i}@${domain}`;
      const phone = `+234${randomItem(SEED_PHONE_PREFIXES)}${randomDigits(7)}`;
      const userId = uid("usr");

      let kycStatus;
      if (i % 10 < 5) kycStatus = "verified";
      else if (i % 10 < 8) kycStatus = "pending";
      else kycStatus = "rejected";

      let accountStatus = "active";
      if (i % 23 === 0) accountStatus = "suspended";
      else if (i % 31 === 0) accountStatus = "blocked";

      const submittedDaysAgo = randomInt(1, 60);
      const createdDaysAgo = submittedDaysAgo + randomInt(0, 180);
      const balance = randomInt(2000, 850000);
      const totalDeposits = balance + randomInt(50000, 1500000);
      const totalWithdrawals = totalDeposits - balance;

      const user = {
        id: userId,
        firstName,
        lastName,
        email,
        phone,
        passwordHash: hashPassword("Demo123!"),
        role: "user",
        status: accountStatus,
        kyc: {
          status: kycStatus,
          idType: idTypeKeys[i % idTypeKeys.length],
          idNumber: randomDigits(11),
          dob: `${randomInt(1970, 2003)}-${String(randomInt(1, 12)).padStart(2, "0")}-${String(randomInt(1, 28)).padStart(2, "0")}`,
          address: `${randomInt(1, 200)} ${randomItem(streets)}`,
          city: location.city,
          state: location.state,
          country: "Nigeria",
          documentImage: null,
          documentImageBack: null,
          submittedAt: daysAgoISO(submittedDaysAgo),
        },
        wallet: { balance, totalDeposits, totalWithdrawals },
        bankAccount: kycStatus === "verified"
          ? { bankName: randomItem(NIGERIAN_BANKS), accountNumber: randomDigits(10), accountName: `${firstName} ${lastName}` }
          : null,
        walletAddresses: {},
        lastLogin: randomLastLogin(location),
        createdAt: daysAgoISO(createdDaysAgo),
      };
      user.virtualAccount = buildVirtualAccount(user);
      users.push(user);

      // ---- Deposit-stage transaction (recent activity, in-progress) ----
      const depAsset = assetSymbols[i % assetSymbols.length];
      const depAmountUSD = randomInt(20, 2000);
      const depCreatedDaysAgo = randomInt(1, 25);
      const depUpdatedDaysAgo = randomInt(0, depCreatedDaysAgo);

      if (i % 2 === 0) {
        const depStatus = ["pending_deposit", "awaiting_confirmation", "deposit_confirmed"][i % 3];
        transactions.push({
          id: uid("txn"),
          userId,
          type: "sell",
          asset: depAsset,
          amountUSD: depAmountUSD,
          rate: DEFAULT_SELL_RATE,
          amountNGN: depAmountUSD * DEFAULT_SELL_RATE,
          status: depStatus,
          depositAddress: ASSETS[depAsset].address,
          bankAccount: null,
          createdAt: daysAgoISO(depCreatedDaysAgo),
          updatedAt: daysAgoISO(depUpdatedDaysAgo),
        });
      } else {
        const depStatus = i % 4 < 2 ? "pending_payment" : "awaiting_payment_confirmation";
        transactions.push({
          id: uid("txn"),
          userId,
          type: "buy",
          asset: depAsset,
          amountUSD: depAmountUSD,
          rate: DEFAULT_BUY_RATE,
          amountNGN: depAmountUSD * DEFAULT_BUY_RATE,
          status: depStatus,
          platformBankAccount: PLATFORM_BANK_ACCOUNT,
          walletAddress: randomWalletAddress(depAsset),
          createdAt: daysAgoISO(depCreatedDaysAgo),
          updatedAt: daysAgoISO(depUpdatedDaysAgo),
        });
      }

      // ---- Withdrawal-stage transaction (older, mostly settled history) ----
      const wdAsset = assetSymbols[(i + 2) % assetSymbols.length];
      const wdAmountUSD = randomInt(20, 3000);
      const wdCreatedDaysAgo = randomInt(5, 60);
      const wdUpdatedDaysAgo = randomInt(0, wdCreatedDaysAgo);

      if (i % 2 === 0) {
        const wdStatus = i % 3 === 0 ? "processing_payout" : "completed";
        transactions.push({
          id: uid("txn"),
          userId,
          type: "sell",
          asset: wdAsset,
          amountUSD: wdAmountUSD,
          rate: DEFAULT_SELL_RATE,
          amountNGN: wdAmountUSD * DEFAULT_SELL_RATE,
          status: wdStatus,
          depositAddress: ASSETS[wdAsset].address,
          bankAccount: { bankName: randomItem(NIGERIAN_BANKS), accountNumber: randomDigits(10), accountName: `${firstName} ${lastName}` },
          createdAt: daysAgoISO(wdCreatedDaysAgo),
          updatedAt: daysAgoISO(wdUpdatedDaysAgo),
        });
      } else {
        const wdStatus = i % 3 === 0 ? "processing_crypto_payout" : "completed";
        transactions.push({
          id: uid("txn"),
          userId,
          type: "buy",
          asset: wdAsset,
          amountUSD: wdAmountUSD,
          rate: DEFAULT_BUY_RATE,
          amountNGN: wdAmountUSD * DEFAULT_BUY_RATE,
          status: wdStatus,
          platformBankAccount: PLATFORM_BANK_ACCOUNT,
          walletAddress: randomWalletAddress(wdAsset),
          createdAt: daysAgoISO(wdCreatedDaysAgo),
          updatedAt: daysAgoISO(wdUpdatedDaysAgo),
        });
      }
    }

    return { users, transactions };
  }

  /* ---------- Seed data ---------- */
  function seed() {
    const adminId = "usr_admin001";
    const demoId = "usr_demo0001";

    const admin = {
      id: adminId,
      firstName: "Payru",
      lastName: "Admin",
      email: "admin@PayRu.com",
      phone: "+2348000000000",
      passwordHash: hashPassword("Admin123!"),
      role: "admin",
      status: "active",
      kyc: { status: "verified" },
      wallet: { balance: 0, totalDeposits: 0, totalWithdrawals: 0 },
      bankAccount: null,
      walletAddresses: {},
      createdAt: nowISO(),
    };
    admin.virtualAccount = buildVirtualAccount(admin);

    const demo = {
      id: demoId,
      firstName: "Ada",
      lastName: "Okafor",
      email: "demo@PayRu.com",
      phone: "+2348012345678",
      passwordHash: hashPassword("Demo123!"),
      role: "user",
      status: "active",
      kyc: {
        status: "verified",
        idType: "nin",
        idNumber: "12345678901",
        dob: "1996-04-12",
        address: "14 Admiralty Way, Lekki Phase 1",
        city: "Lagos",
        state: "Lagos",
        country: "Nigeria",
        documentImage: null,
        submittedAt: nowISO(),
      },
      wallet: { balance: 243000, totalDeposits: 891000, totalWithdrawals: 648000 },
      bankAccount: { bankName: "Guaranty Trust Bank (GTBank)", accountNumber: "0123456789", accountName: "Ada Okafor" },
      walletAddresses: {},
      lastLogin: { ip: "105.112.34.201", location: "Lagos, Lagos, Nigeria", device: "Chrome on Windows", at: nowISO() },
      createdAt: nowISO(),
    };
    demo.virtualAccount = buildVirtualAccount(demo);

    const transactions = [
      {
        id: uid("txn"),
        userId: demoId,
        type: "sell",
        asset: "USDT",
        amountUSD: 400,
        rate: DEFAULT_SELL_RATE,
        amountNGN: 400 * DEFAULT_SELL_RATE,
        status: "completed",
        depositAddress: ASSETS.USDT.address,
        bankAccount: demo.bankAccount,
        createdAt: new Date(Date.now() - 6 * 86400000).toISOString(),
        updatedAt: new Date(Date.now() - 6 * 86400000).toISOString(),
      },
      {
        id: uid("txn"),
        userId: demoId,
        type: "sell",
        asset: "BTC",
        amountUSD: 150,
        rate: DEFAULT_SELL_RATE,
        amountNGN: 150 * DEFAULT_SELL_RATE,
        status: "completed",
        depositAddress: ASSETS.BTC.address,
        bankAccount: demo.bankAccount,
        createdAt: new Date(Date.now() - 3 * 86400000).toISOString(),
        updatedAt: new Date(Date.now() - 3 * 86400000).toISOString(),
      },
      {
        id: uid("txn"),
        userId: demoId,
        type: "sell",
        asset: "ETH",
        amountUSD: 150,
        rate: DEFAULT_SELL_RATE,
        amountNGN: 150 * DEFAULT_SELL_RATE,
        status: "awaiting_confirmation",
        depositAddress: ASSETS.ETH.address,
        bankAccount: null,
        createdAt: new Date(Date.now() - 2 * 3600000).toISOString(),
        updatedAt: new Date(Date.now() - 2 * 3600000).toISOString(),
      },
      ...buildExtraDemoTransactions(demo),
    ];

    const notifications = [
      {
        id: uid("ntf"),
        userId: demoId,
        type: "success",
        title: "Payout completed",
        message: "₦243,000 has been sent to your GTBank account ending 6789.",
        read: true,
        createdAt: new Date(Date.now() - 3 * 86400000).toISOString(),
      },
      {
        id: uid("ntf"),
        userId: demoId,
        type: "info",
        title: "Deposit pending confirmation",
        message: "We're waiting for your ETH deposit to be confirmed on the network.",
        read: false,
        createdAt: new Date(Date.now() - 2 * 3600000).toISOString(),
      },
      {
        id: uid("ntf"),
        userId: demoId,
        type: "success",
        title: "Welcome to PayRu",
        message: "Your account was created successfully. Complete your KYC to start trading.",
        read: true,
        createdAt: new Date(Date.now() - 10 * 86400000).toISOString(),
      },
    ];

    const bulk = generateBulkSeedData();

    return {
      users: [admin, demo, ...bulk.users],
      transactions: [...transactions, ...bulk.transactions],
      notifications,
      settings: { buyRate: DEFAULT_BUY_RATE, sellRate: DEFAULT_SELL_RATE, derivRate: 1580 },
      derivSettings: { companyCR: "CR9001234", paymentID: "PAY-PAYRU-001" },
      derivTransactions: [],
    };
  }

  /* ---------- Session ---------- */
  function getSession() {
    return localStorage.getItem(SESSION_KEY);
  }

  function setSession(userId) {
    localStorage.setItem(SESSION_KEY, userId);
  }

  function clearSession() {
    localStorage.removeItem(SESSION_KEY);
  }

  function getCurrentUser() {
    const id = getSession();
    if (!id) return null;
    const db = load();
    return db.users.find((u) => u.id === id) || null;
  }

  function requireAuth(redirectTo) {
    const user = getCurrentUser();
    if (!user) {
      window.location.href = redirectTo || "login.html";
      return null;
    }
    if (user.role === "user" && user.status && user.status !== "active") {
      clearSession();
      setFlash(`Your account has been ${user.status}. Please contact support for assistance.`, "error");
      window.location.href = redirectTo || "login.html";
      return null;
    }
    return user;
  }

  function requireAdmin(redirectTo) {
    const user = getCurrentUser();
    if (!user || user.role !== "admin") {
      window.location.href = redirectTo || "login.html";
      return null;
    }
    return user;
  }

  function requireGuest(redirectTo) {
    const user = getCurrentUser();
    if (user) {
      window.location.href = redirectTo || (user.role === "admin" ? "admin/dashboard.html" : "dashboard.html");
      return false;
    }
    return true;
  }

  /* ---------- Users ---------- */
  function findUserByEmail(email) {
    const db = load();
    return db.users.find((u) => u.email.toLowerCase() === email.toLowerCase()) || null;
  }

  function getUser(id) {
    const db = load();
    return db.users.find((u) => u.id === id) || null;
  }

  function saveUser(updatedUser) {
    const db = load();
    const idx = db.users.findIndex((u) => u.id === updatedUser.id);
    if (idx !== -1) {
      db.users[idx] = updatedUser;
      save(db);
    }
    return updatedUser;
  }

  function register({ firstName, lastName, email, phone, password }) {
    if (findUserByEmail(email)) {
      return { ok: false, error: "An account with this email already exists." };
    }
    const db = load();
    const user = {
      id: uid("usr"),
      firstName,
      lastName,
      email,
      phone,
      passwordHash: hashPassword(password),
      role: "user",
      status: "active",
      kyc: { status: "unverified" },
      wallet: { balance: 0, totalDeposits: 0, totalWithdrawals: 0 },
      bankAccount: null,
      walletAddresses: {},
      createdAt: nowISO(),
    };
    user.virtualAccount = buildVirtualAccount(user);
    db.users.push(user);
    save(db);
    addNotification(user.id, {
      type: "success",
      title: "Welcome to PayRu",
      message: "Your account was created successfully. Complete your KYC to start trading.",
    });
    return { ok: true, user };
  }

  function login(email, password) {
    const user = findUserByEmail(email);
    if (!user || user.passwordHash !== hashPassword(password)) {
      return { ok: false, error: "Invalid email or password." };
    }
    if (user.status === "suspended") {
      return { ok: false, error: "Your account has been suspended. Please contact support for assistance." };
    }
    if (user.status === "blocked") {
      return { ok: false, error: "Your account has been blocked. Please contact support for assistance." };
    }
    setSession(user.id);
    return { ok: true, user };
  }

  function generateResetToken(email) {
    const user = findUserByEmail(email);
    if (!user) return { ok: false, error: "No account found with that email." };
    const token = Math.random().toString(36).slice(2, 8).toUpperCase();
    user.resetToken = token;
    user.resetTokenExpires = Date.now() + 30 * 60 * 1000;
    saveUser(user);
    return { ok: true, token };
  }

  function changePassword(userId, currentPassword, newPassword) {
    const user = getUser(userId);
    if (!user) return { ok: false, error: "User not found." };
    if (user.passwordHash !== hashPassword(currentPassword)) {
      return { ok: false, error: "Current password is incorrect." };
    }
    user.passwordHash = hashPassword(newPassword);
    saveUser(user);
    return { ok: true };
  }

  function resetPassword(email, token, newPassword) {
    const user = findUserByEmail(email);
    if (!user || user.resetToken !== token.trim().toUpperCase()) {
      return { ok: false, error: "Invalid or expired reset code." };
    }
    if (user.resetTokenExpires && Date.now() > user.resetTokenExpires) {
      return { ok: false, error: "This reset code has expired. Please request a new one." };
    }
    user.passwordHash = hashPassword(newPassword);
    delete user.resetToken;
    delete user.resetTokenExpires;
    saveUser(user);
    return { ok: true };
  }

  /* ---------- KYC ---------- */
  function submitKYC(userId, data) {
    const user = getUser(userId);
    if (!user) return { ok: false, error: "User not found." };
    user.kyc = {
      status: "pending",
      idType: data.idType,
      idNumber: data.idNumber,
      dob: data.dob,
      address: data.address,
      city: data.city,
      state: data.state,
      country: data.country || "Nigeria",
      documentImage: data.documentImage || null,
      documentImageBack: data.documentImageBack || null,
      submittedAt: nowISO(),
    };
    saveUser(user);
    addNotification(userId, {
      type: "info",
      title: "KYC submitted",
      message: "Your identity verification documents have been submitted and are under review.",
    });
    return { ok: true, user };
  }

  function setKYCStatus(userId, status) {
    const user = getUser(userId);
    if (!user) return null;
    user.kyc.status = status;
    saveUser(user);
    addNotification(userId, {
      type: status === "verified" ? "success" : "error",
      title: status === "verified" ? "KYC approved" : "KYC rejected",
      message:
        status === "verified"
          ? "Your identity verification was approved. You can now start trading."
          : "Your identity verification was rejected. Please review your details and resubmit.",
    });

    if (status === "verified" && !user.bankAccount) {
      addNotification(userId, {
        type: "info",
        title: "Add your payout bank account",
        message: "Add a payout bank account in your profile so you can receive funds when you sell crypto. The account name must match your registered name.",
      });
    }

    return user;
  }

  /* ---------- Account status (suspend / block) ---------- */
  function setUserStatus(userId, status) {
    const user = getUser(userId);
    if (!user) return null;
    user.status = status;
    saveUser(user);
    if (status !== "active") {
      addNotification(userId, {
        type: "error",
        title: status === "suspended" ? "Account suspended" : "Account blocked",
        message:
          status === "suspended"
            ? "Your account has been temporarily suspended. Please contact support for assistance."
            : "Your account has been blocked. Please contact support for assistance.",
      });
    } else {
      addNotification(userId, {
        type: "success",
        title: "Account reactivated",
        message: "Your account has been reactivated. You can continue using PayRu.",
      });
    }
    return user;
  }

  /* ---------- Transactions ---------- */
  function getAssets() {
    return ASSETS;
  }

  function getBuyRate() {
    return load().settings.buyRate;
  }

  function getSellRate() {
    return load().settings.sellRate;
  }

  function getDerivRate() {
    return load().settings.derivRate || 1580;
  }

  function setRates({ buyRate, sellRate, derivRate }) {
    const db = load();
    if (buyRate  !== undefined) db.settings.buyRate  = buyRate;
    if (sellRate !== undefined) db.settings.sellRate = sellRate;
    if (derivRate !== undefined) db.settings.derivRate = derivRate;
    save(db);
    return db.settings;
  }

  function getTransactions(userId) {
    const db = load();
    return db.transactions
      .filter((t) => t.userId === userId)
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  }

  function getAllTransactions() {
    const db = load();
    return db.transactions.slice().sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  }

  function getTransaction(id) {
    const db = load();
    return db.transactions.find((t) => t.id === id) || null;
  }

  function saveTransaction(txn) {
    const db = load();
    const idx = db.transactions.findIndex((t) => t.id === txn.id);
    txn.updatedAt = nowISO();
    if (idx !== -1) {
      db.transactions[idx] = txn;
    } else {
      db.transactions.push(txn);
    }
    save(db);
    return txn;
  }

  function createSellOrder(userId, { amountUSD, asset }) {
    const assetInfo = ASSETS[asset];
    if (!assetInfo) return { ok: false, error: "Unsupported asset." };
    const rate = getSellRate();
    const txn = {
      id: uid("txn"),
      userId,
      type: "sell",
      asset,
      amountUSD,
      rate,
      amountNGN: amountUSD * rate,
      status: "pending_deposit",
      depositAddress: assetInfo.address,
      bankAccount: null,
      createdAt: nowISO(),
      updatedAt: nowISO(),
    };
    saveTransaction(txn);
    return { ok: true, txn };
  }

  function markDepositSent(txnId) {
    const txn = getTransaction(txnId);
    if (!txn) return null;
    txn.status = "awaiting_confirmation";
    saveTransaction(txn);
    addNotification(txn.userId, {
      type: "info",
      title: "Deposit pending confirmation",
      message: `We're waiting for your ${txn.asset} deposit to be confirmed on the network.`,
    });
    return txn;
  }

  function confirmDeposit(txnId) {
    const txn = getTransaction(txnId);
    if (!txn) return null;
    txn.status = "deposit_confirmed";
    saveTransaction(txn);
    const user = getUser(txn.userId);
    addNotification(txn.userId, {
      type: "success",
      title: "Deposit received",
      message: `Your ${txn.asset} deposit worth $${txn.amountUSD.toLocaleString()} (₦${txn.amountNGN.toLocaleString()}) has been received. ${
        user && user.bankAccount ? "Confirm the payout account to continue." : "Please add your payout bank account to receive your funds."
      }`,
    });
    return txn;
  }

  function submitBankDetails(txnId, bankAccount) {
    const txn = getTransaction(txnId);
    if (!txn) return null;
    txn.bankAccount = bankAccount;
    txn.status = "processing_payout";
    saveTransaction(txn);

    const user = getUser(txn.userId);
    if (user) {
      user.bankAccount = bankAccount;
      saveUser(user);
    }

    addNotification(txn.userId, {
      type: "info",
      title: "Payout processing",
      message: `Your payout of ₦${txn.amountNGN.toLocaleString()} is being processed to ${bankAccount.bankName} (****${bankAccount.accountNumber.slice(-4)}).`,
    });
    return txn;
  }

  function completePayout(txnId) {
    const txn = getTransaction(txnId);
    if (!txn) return null;
    txn.status = "completed";
    saveTransaction(txn);

    const user = getUser(txn.userId);
    if (user) {
      user.wallet.totalDeposits += txn.amountNGN;
      user.wallet.totalWithdrawals += txn.amountNGN;
      saveUser(user);
    }

    addNotification(txn.userId, {
      type: "success",
      title: "Payout completed",
      message: `₦${txn.amountNGN.toLocaleString()} has been sent to your ${txn.bankAccount.bankName} account ending ${txn.bankAccount.accountNumber.slice(-4)}.`,
    });
    return txn;
  }

  function cancelTransaction(txnId) {
    const txn = getTransaction(txnId);
    if (!txn) return null;
    txn.status = "cancelled";
    saveTransaction(txn);
    const orderLabel = txn.type === "buy" ? "buy order" : "sell order";
    addNotification(txn.userId, {
      type: "error",
      title: "Transaction cancelled",
      message: `Your ${txn.asset} ${orderLabel} for $${txn.amountUSD.toLocaleString()} was cancelled.`,
    });
    return txn;
  }

  /* ---------- Buy Crypto flow ---------- */
  function createBuyOrder(userId, { amountUSD, asset, walletAddress }) {
    const assetInfo = ASSETS[asset];
    if (!assetInfo) return { ok: false, error: "Unsupported asset." };
    const rate = getBuyRate();
    const txn = {
      id: uid("txn"),
      userId,
      type: "buy",
      asset,
      amountUSD,
      rate,
      amountNGN: amountUSD * rate,
      status: "pending_payment",
      platformBankAccount: PLATFORM_BANK_ACCOUNT,
      walletAddress,
      createdAt: nowISO(),
      updatedAt: nowISO(),
    };
    saveTransaction(txn);

    const user = getUser(userId);
    if (user) {
      if (!user.walletAddresses) user.walletAddresses = {};
      user.walletAddresses[asset] = walletAddress;
      saveUser(user);
    }

    return { ok: true, txn };
  }

  function markPaymentSent(txnId) {
    const txn = getTransaction(txnId);
    if (!txn) return null;
    txn.status = "awaiting_payment_confirmation";
    saveTransaction(txn);
    addNotification(txn.userId, {
      type: "info",
      title: "Payment pending confirmation",
      message: `We're waiting for your ₦${txn.amountNGN.toLocaleString()} payment to be confirmed.`,
    });
    return txn;
  }

  function confirmPayment(txnId) {
    const txn = getTransaction(txnId);
    if (!txn) return null;
    txn.status = "processing_crypto_payout";
    saveTransaction(txn);
    addNotification(txn.userId, {
      type: "success",
      title: "Payment received",
      message: `Your payment of ₦${txn.amountNGN.toLocaleString()} has been confirmed. Your ${formatCryptoAmount(txn.amountUSD / assetPrice(txn.asset), txn.asset)} ${txn.asset} is being sent to your wallet address.`,
    });
    return txn;
  }

  function completeCryptoPayout(txnId) {
    const txn = getTransaction(txnId);
    if (!txn) return null;
    txn.status = "completed";
    saveTransaction(txn);

    const user = getUser(txn.userId);
    if (user) {
      user.wallet.totalDeposits += txn.amountNGN;
      user.wallet.totalWithdrawals += txn.amountNGN;
      saveUser(user);
    }

    addNotification(txn.userId, {
      type: "success",
      title: "Crypto payout completed",
      message: `${formatCryptoAmount(txn.amountUSD / assetPrice(txn.asset), txn.asset)} ${txn.asset} has been sent to ${txn.walletAddress ? "your wallet (" + txn.walletAddress.slice(0, 6) + "…" + txn.walletAddress.slice(-4) + ")" : "your wallet"}.`,
    });
    return txn;
  }

  function assetPrice(symbol) {
    const a = ASSETS[symbol];
    return a ? a.price : 1;
  }

  function formatCryptoAmount(amount, symbol) {
    const decimals = symbol === "USDT" || symbol === "USDC" ? 2 : 6;
    return amount.toFixed(decimals);
  }

  /* ---------- Notifications ---------- */
  function getNotifications(userId) {
    const db = load();
    return db.notifications
      .filter((n) => n.userId === userId)
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  }

  function addNotification(userId, { type, title, message }) {
    const db = load();
    const ntf = {
      id: uid("ntf"),
      userId,
      type: type || "info",
      title,
      message,
      read: false,
      createdAt: nowISO(),
    };
    db.notifications.unshift(ntf);
    save(db);
    return ntf;
  }

  function markNotificationRead(id) {
    const db = load();
    const ntf = db.notifications.find((n) => n.id === id);
    if (ntf) {
      ntf.read = true;
      save(db);
    }
    return ntf;
  }

  function markAllNotificationsRead(userId) {
    const db = load();
    db.notifications.forEach((n) => {
      if (n.userId === userId) n.read = true;
    });
    save(db);
  }

  function getUnreadCount(userId) {
    const db = load();
    return db.notifications.filter((n) => n.userId === userId && !n.read).length;
  }

  function broadcastNotification({ audience, title, message }) {
    const db = load();
    const now = nowISO();
    let recipients = db.users.filter((u) => u.role === "user");
    if (audience === "verified") {
      recipients = recipients.filter((u) => u.kyc.status === "verified");
    } else if (audience === "unverified") {
      recipients = recipients.filter((u) => u.kyc.status !== "verified");
    }
    recipients.forEach((u) => {
      db.notifications.unshift({
        id: uid("ntf"),
        userId: u.id,
        type: "info",
        title,
        message,
        read: false,
        createdAt: now,
      });
    });
    save(db);
    return recipients.length;
  }

  /* ---------- Admin helpers ---------- */
  function getAllUsers() {
    const db = load();
    return db.users.slice().sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  }

  function getStats() {
    const db = load();
    const users = db.users.filter((u) => u.role === "user");
    const txns = db.transactions;
    return {
      totalUsers: users.length,
      pendingKYC: users.filter((u) => u.kyc.status === "pending").length,
      verifiedUsers: users.filter((u) => u.kyc.status === "verified").length,
      pendingDeposits: txns.filter((t) =>
        t.status === "awaiting_confirmation" || t.status === "pending_deposit" ||
        t.status === "awaiting_payment_confirmation" || t.status === "pending_payment"
      ).length,
      pendingPayouts: txns.filter((t) => t.status === "processing_payout" || t.status === "processing_crypto_payout").length,
      totalDepositVolumeNGN: users.reduce((sum, u) => sum + (u.wallet?.totalDeposits || 0), 0),
      totalWithdrawalVolumeNGN: users.reduce((sum, u) => sum + (u.wallet?.totalWithdrawals || 0), 0),
    };
  }

  /* ---------- Flash messages (cross-page toasts) ---------- */
  function setFlash(message, type) {
    sessionStorage.setItem("payru_flash", JSON.stringify({ message, type: type || "success" }));
  }

  function consumeFlash() {
    const raw = sessionStorage.getItem("payru_flash");
    if (!raw) return null;
    sessionStorage.removeItem("payru_flash");
    try {
      return JSON.parse(raw);
    } catch (e) {
      return null;
    }
  }

  /* ---------- Formatting ---------- */
  function formatNaira(amount) {
    return "₦" + Math.round(amount).toLocaleString("en-NG");
  }

  function formatUSD(amount) {
    return "$" + amount.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }

  function formatDate(iso) {
    const d = new Date(iso);
    return d.toLocaleDateString("en-US", { day: "numeric", month: "short", year: "numeric" }) +
      " · " + d.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" });
  }

  function timeAgo(iso) {
    const diff = Date.now() - new Date(iso).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return "just now";
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    const days = Math.floor(hrs / 24);
    if (days < 7) return `${days}d ago`;
    return formatDate(iso);
  }

  const STATUS_LABELS = {
    pending_deposit: { label: "Awaiting Deposit", class: "badge-warning" },
    awaiting_confirmation: { label: "Confirming", class: "badge-info" },
    deposit_confirmed: { label: "Awaiting Bank Details", class: "badge-info" },
    processing_payout: { label: "Processing Payout", class: "badge-warning" },
    pending_payment: { label: "Awaiting Payment", class: "badge-warning" },
    awaiting_payment_confirmation: { label: "Confirming Payment", class: "badge-info" },
    processing_crypto_payout: { label: "Processing Crypto Payout", class: "badge-warning" },
    completed: { label: "Completed", class: "badge-success" },
    cancelled: { label: "Cancelled", class: "badge-danger" },
  };

  const ACCOUNT_STATUS_LABELS = {
    active: { label: "Active", class: "badge-success" },
    suspended: { label: "Suspended", class: "badge-warning" },
    blocked: { label: "Blocked", class: "badge-danger" },
  };

  /* ---------- Wallet helpers ---------- */
  function getWalletBalance(userId) {
    const user = getUser(userId);
    return user ? (user.wallet?.balance || 0) : 0;
  }

  function debitWallet(userId, amountNGN) {
    const user = getUser(userId);
    if (!user) return { success: false, reason: "User not found" };
    const bal = user.wallet?.balance || 0;
    if (bal < amountNGN) return { success: false, reason: "Insufficient funds", balance: bal };
    user.wallet.balance      -= amountNGN;
    user.wallet.totalWithdrawals = (user.wallet.totalWithdrawals || 0) + amountNGN;
    saveUser(user);
    return { success: true, balance: user.wallet.balance };
  }

  function creditWallet(userId, amountNGN) {
    const user = getUser(userId);
    if (!user) return false;
    user.wallet.balance     = (user.wallet.balance || 0) + amountNGN;
    user.wallet.totalDeposits = (user.wallet.totalDeposits || 0) + amountNGN;
    saveUser(user);
    return true;
  }

  /* ---------- Deriv Funding ---------- */
  const DERIV_STATUS_LABELS = {
    pending:    { label: "Pending",    class: "badge-warning" },
    processing: { label: "Processing", class: "badge-info" },
    funded:     { label: "Funded",     class: "badge-success" },
    received:   { label: "CR Received",class: "badge-info" },
    paid:       { label: "Bank Paid",  class: "badge-success" },
    rejected:   { label: "Rejected",  class: "badge-danger" },
  };

  function getDerivSettings() {
    return load().derivSettings;
  }

  function updateDerivSettings(updates) {
    const db = load();
    Object.assign(db.derivSettings, updates);
    save(db);
    return db.derivSettings;
  }

  function verifyCR(crNumber) {
    // Mock CR verification — in production this would call the Deriv API.
    // Accepts any CR number that starts with "CR" followed by digits.
    return /^CR\d{5,10}$/i.test(crNumber.trim());
  }

  function createDerivTransaction({ userId, type, userCR, amountUSD }) {
    const db      = load();
    const sellRate = db.settings.sellRate || DEFAULT_SELL_RATE;
    const amtNGN  = parseFloat(amountUSD) * sellRate;

    // Fund requests: debit wallet upfront (wallet must have enough NGN)
    if (type === "fund") {
      const result = debitWallet(userId, amtNGN);
      if (!result.success) return { error: result.reason, balance: result.balance };
    }

    const record = {
      id: uid("drv"),
      userId,
      type,
      userCR: (userCR || "").trim().toUpperCase(),
      amountUSD: parseFloat(amountUSD),
      amountNGN: amtNGN,
      status: "pending",
      createdAt: nowISO(),
      updatedAt: nowISO(),
      note: "",
    };
    db.derivTransactions.unshift(record);
    save(db);
    return record;
  }

  function getUserDerivTransactions(userId) {
    return load().derivTransactions.filter((t) => t.userId === userId);
  }

  function getAllDerivTransactions() {
    const db = load();
    const userMap = {};
    db.users.forEach((u) => { userMap[u.id] = u; });
    return db.derivTransactions.map((t) => ({ ...t, user: userMap[t.userId] || null }));
  }

  function updateDerivTransaction(id, updates) {
    const db = load();
    const tx = db.derivTransactions.find((t) => t.id === id);
    if (!tx) return null;
    const prev = tx.status;
    Object.assign(tx, updates, { updatedAt: nowISO() });
    save(db);
    // Credit wallet when admin marks a withdrawal as paid
    if (tx.type === "withdraw" && updates.status === "paid" && prev !== "paid") {
      creditWallet(tx.userId, tx.amountNGN);
    }
    return tx;
  }

  function getDerivStats() {
    const db = load();
    const all = db.derivTransactions;
    const funded    = all.filter((t) => t.type === "fund"     && t.status === "funded");
    const paid      = all.filter((t) => t.type === "withdraw" && t.status === "paid");
    const pending   = all.filter((t) => t.status === "pending" || t.status === "processing" || t.status === "received");
    return {
      totalFunded:    funded.reduce((s, t) => s + t.amountUSD, 0),
      totalWithdrawn: paid.reduce((s, t) => s + t.amountUSD, 0),
      pendingCount:   pending.length,
      totalCount:     all.length,
    };
  }

  /* ---------- Public API ---------- */
  global.PayruDB = {
    ASSETS,
    KYC_TYPES,
    NIGERIAN_BANKS,
    PLATFORM_BANK_ACCOUNT,
    STATUS_LABELS,
    ACCOUNT_STATUS_LABELS,
    // session
    getSession, setSession, clearSession, getCurrentUser,
    requireAuth, requireAdmin, requireGuest,
    // users
    findUserByEmail, getUser, saveUser, register, login,
    generateResetToken, resetPassword, changePassword, setUserStatus,
    // kyc
    submitKYC, setKYCStatus, accountNameMatches,
    // transactions
    getAssets, getBuyRate, getSellRate, getDerivRate, setRates, getTransactions, getAllTransactions, getTransaction, saveTransaction,
    createSellOrder, markDepositSent, confirmDeposit, submitBankDetails, completePayout, cancelTransaction,
    createBuyOrder, markPaymentSent, confirmPayment, completeCryptoPayout,
    formatCryptoAmount,
    // notifications
    getNotifications, addNotification, markNotificationRead, markAllNotificationsRead, getUnreadCount, broadcastNotification,
    // flash messages
    setFlash, consumeFlash,
    // admin
    getAllUsers, getStats,
    // wallet
    getWalletBalance, debitWallet, creditWallet,
    // deriv funding
    DERIV_STATUS_LABELS,
    getDerivSettings, updateDerivSettings, verifyCR,
    createDerivTransaction, getUserDerivTransactions, getAllDerivTransactions,
    updateDerivTransaction, getDerivStats,
    // formatting
    formatNaira, formatUSD, formatDate, timeAgo,
  };
})(window);
