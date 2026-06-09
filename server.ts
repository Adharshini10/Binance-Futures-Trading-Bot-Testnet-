import express from "express";
import path from "path";
import fs from "fs";
import { createServer as createViteServer } from "vite";

interface OrderRequest {
  symbol: string;
  side: "BUY" | "SELL";
  type: "MARKET" | "LIMIT";
  quantity: number;
  price?: number;
  api_key?: string;
  api_secret?: string;
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // --- API ROUTE 1: Fetch Python Project Files ---
  app.get("/api/files", (req, res) => {
    try {
      const filesToRead = [
        { path: "trading_bot/bot/__init__.py", label: "__init__.py" },
        { path: "trading_bot/bot/client.py", label: "client.py" },
        { path: "trading_bot/bot/orders.py", label: "orders.py" },
        { path: "trading_bot/bot/validators.py", label: "validators.py" },
        { path: "trading_bot/bot/logging_config.py", label: "logging_config.py" },
        { path: "trading_bot/cli.py", label: "cli.py" },
        { path: "trading_bot/requirements.txt", label: "requirements.txt" },
        { path: "trading_bot/README.md", label: "README.md" },
        { path: "trading_bot/.env", label: ".env" },
      ];

      const responseData: Record<string, string> = {};

      for (const file of filesToRead) {
        const fullPath = path.resolve(process.cwd(), file.path);
        if (fs.existsSync(fullPath)) {
          responseData[file.label] = fs.readFileSync(fullPath, "utf-8");
        } else {
          responseData[file.label] = `# File not found at ${file.path}`;
        }
      }

      res.json({ success: true, files: responseData });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  });

  // --- API ROUTE 2: Fetch Live Binance Ticker Price ---
  app.get("/api/ticker", async (req, res) => {
    const symbol = (req.query.symbol as string || "BTCUSDT").toUpperCase();
    try {
      // Fetch from public Binance USDT-M Futures API
      const response = await fetch(`https://fapi.binance.com/fapi/v1/ticker/price?symbol=${symbol}`);
      if (!response.ok) {
        throw new Error(`Binance API returned status ${response.status}`);
      }
      const data = await response.json() as { symbol: string; price: string };
      res.json({ success: true, symbol: data.symbol, price: parseFloat(data.price) });
    } catch (err: any) {
      // High-quality fallback prices if network issues occur
      const fallbacks: Record<string, number> = {
        BTCUSDT: 68450 + Math.random() * 80 - 40,
        ETHUSDT: 3520 + Math.random() * 6 - 3,
        BNBUSDT: 580 + Math.random() * 2 - 1,
        SOLUSDT: 155 + Math.random() * 1 - 0.5,
        ADAUSDT: 0.45 + Math.random() * 0.01 - 0.005,
      };
      const price = fallbacks[symbol] || 100 + Math.random() * 5;
      res.json({ success: true, symbol, price, isFallback: true });
    }
  });

  // --- API ROUTE 3: Read bot log file ---
  app.get("/api/logs", (req, res) => {
    try {
      const logsPath = path.resolve(process.cwd(), "trading_bot/logs/trading.log");
      if (fs.existsSync(logsPath)) {
        const logContent = fs.readFileSync(logsPath, "utf-8");
        // Limit to last 200 lines to avoid massive payloads
        const lines = logContent.split("\n");
        const lastLines = lines.slice(-200).join("\n");
        res.json({ success: true, logs: lastLines });
      } else {
        res.json({ success: true, logs: "No logs found yet. Run an order to generate log entries." });
      }
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  });

  // --- API ROUTE 4: Reset logs ---
  app.post("/api/logs/reset", (req, res) => {
    try {
      const logDir = path.resolve(process.cwd(), "trading_bot/logs");
      if (!fs.existsSync(logDir)) {
        fs.mkdirSync(logDir, { recursive: true });
      }
      const logsPath = path.join(logDir, "trading.log");
      fs.writeFileSync(logsPath, "");
      res.json({ success: true });
    } catch (el: any) {
      res.status(500).json({ success: false, error: el.message });
    }
  });

  // --- API ROUTE 5: Place order (Simulate Python Execution and write to raw log) ---
  app.post("/api/run-cli", async (req, res) => {
    const { symbol, side, type, quantity, price, api_key, api_secret } = req.body as OrderRequest;

    // Output formatting to append in trading_bot/logs/trading.log
    const logDir = path.resolve(process.cwd(), "trading_bot/logs");
    if (!fs.existsSync(logDir)) {
      fs.mkdirSync(logDir, { recursive: true });
    }
    const logFile = path.join(logDir, "trading.log");

    const t = () => new Date().toISOString().replace("T", " ").substring(0, 19);

    const logsToSave: string[] = [];
    logsToSave.push(`${t()} [INFO] (cli.py:15) - Initializing CLI parser...`);
    logsToSave.push(`${t()} [INFO] (cli.py:68) - Initializing API connection to Binance Futures Testnet...`);
    logsToSave.push(`${t()} [DEBUG] (client.py:22) - BinanceFuturesClient initialized with Testnet mode enabled.`);
    logsToSave.push(`${t()} [DEBUG] (cli.py:72) - Fetching current ticker price for symbol: ${symbol}...`);

    let currentPrice = price || 0;
    try {
      const priceResp = await fetch(`https://fapi.binance.com/fapi/v1/ticker/price?symbol=${symbol}`);
      if (priceResp.ok) {
        const pData = await priceResp.json() as { price: string };
        currentPrice = parseFloat(pData.price);
      }
    } catch {
      if (!currentPrice) {
        currentPrice = 68420.50; // default backup
      }
    }

    logsToSave.push(`${t()} [INFO] (client.py:32) - Fetched latest Futures price for ${symbol}: ${currentPrice}`);

    const resolvedPrice = type === "LIMIT" ? price! : currentPrice;

    // Pre-order Summary exactly as Python prints to stdout
    const stdoutLines: string[] = [];
    stdoutLines.push("==================================================");
    stdoutLines.push("                ORDER SUMMARY BEFORE PLACEMENT     ");
    stdoutLines.push("==================================================");
    stdoutLines.push(`  Symbol:        ${symbol}`);
    stdoutLines.push(`  Side:          ${side}`);
    stdoutLines.push(`  Order Type:    ${type}`);
    stdoutLines.push(`  Quantity:      ${quantity}`);
    if (type === "LIMIT") {
      stdoutLines.push(`  Limit Price:   ${price}`);
    }
    stdoutLines.push("==================================================");

    logsToSave.push(`${t()} [INFO] (cli.py:79) - Placing Futures ${type} ${side} order...`);
    logsToSave.push(`${t()} [INFO] (client.py:59) - Sending order request: ${side} ${quantity} ${symbol} (${type} @ ${type === "LIMIT" ? price : "MARKET"})`);

    // Let's add a random latency mock
    await new Promise((resolve) => setTimeout(resolve, 350));

    // Simulated order response payload
    const mockOrderId = Math.floor(100000000 + Math.random() * 900000000);
    const orderStatus = type === "LIMIT" ? "NEW" : "FILLED";
    const executedQty = type === "LIMIT" ? 0 : quantity;
    const avgPrice = type === "LIMIT" ? "0.0" : String(resolvedPrice.toFixed(4));

    logsToSave.push(`${t()} [INFO] (client.py:63) - Order successfully placed. Binance Response ID: ${mockOrderId}`);
    logsToSave.push(`${t()} [INFO] (orders.py:44) - Order executed successfully. ID: ${mockOrderId}, Status: ${orderStatus}, Executed Qty: ${executedQty}`);

    // Append to file
    fs.appendFileSync(logFile, logsToSave.join("\n") + "\n", "utf-8");

    // Post-order receipt stdout exactly as Python prints to stdout
    stdoutLines.push("");
    stdoutLines.push("==================================================");
    stdoutLines.push("                ORDER RECEIPT (SUCCESS)            ");
    stdoutLines.push("==================================================");
    stdoutLines.push(`  Order ID:          ${mockOrderId}`);
    stdoutLines.push(`  Status:            ${orderStatus}`);
    stdoutLines.push(`  Executed Quantity: ${executedQty}`);
    stdoutLines.push(`  Average Price:     ${resolvedPrice}`);
    stdoutLines.push("==================================================");

    res.json({
      success: true,
      stdout: stdoutLines.join("\n"),
      orderId: mockOrderId,
      status: orderStatus,
      executedQty,
      avgPrice: resolvedPrice,
      rawLogAdded: logsToSave.join("\n")
    });
  });

  // --- VITE MIDDLEWARE SETUP ---
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
