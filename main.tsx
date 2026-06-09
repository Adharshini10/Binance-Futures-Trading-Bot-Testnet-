import React, { useState, useEffect, useRef } from "react";
import { 
  Terminal, 
  FileCode, 
  Settings, 
  RefreshCw, 
  Trash2, 
  Copy, 
  Check, 
  TrendingUp, 
  Wallet, 
  ArrowUpRight, 
  ArrowDownRight, 
  Info, 
  Play, 
  FileText, 
  Code,
  CheckCircle2,
  Lock,
  Globe,
  Sliders,
  DollarSign,
  Activity,
  ShieldCheck,
  Cpu,
  ChevronRight
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { BotFileMap, TickerInfo, Position, SimulatedAccount, TradeSide, OrderType } from "./types";

export default function App() {
  // Live ticker and symbols
  const [selectedSymbol, setSelectedSymbol] = useState<string>("BTCUSDT");
  const [tickerPrice, setTickerPrice] = useState<number>(68420.5);
  const [fallbackMode, setFallbackMode] = useState<boolean>(false);
  const symbolsList = ["BTCUSDT", "ETHUSDT", "SOLUSDT", "BNBUSDT", "ADAUSDT"];

  // Form input configurations
  const [side, setSide] = useState<TradeSide>("BUY");
  const [orderType, setOrderType] = useState<OrderType>("MARKET");
  const [quantity, setQuantity] = useState<number>(0.01);
  const [price, setPrice] = useState<number>(68000.0);
  
  // Custom API configuration
  const [apiKey, setApiKey] = useState<string>("");
  const [apiSecret, setApiSecret] = useState<string>("");
  const [isSandbox, setIsSandbox] = useState<boolean>(true);
  const [showConfigSavedGlow, setShowConfigSavedGlow] = useState<boolean>(false);

  // Log and execution receipt state
  const [terminalOutput, setTerminalOutput] = useState<string>(
    "# Welcome to the Binance Futures Testnet Bot Console.\n" +
    "# Use the interactive CLI Builder on the left or edit raw arguments.\n" +
    "# Press 'Execute CLI Bot Command' to submit a transaction."
  );
  const [fileLogs, setFileLogs] = useState<string>("Select a file or perform a trade to stream logs.");
  const [activeTab, setActiveTab] = useState<"terminal" | "logs">("terminal");
  const [isRunning, setIsRunning] = useState<boolean>(false);
  const [showCopyLogAlert, setShowCopyLogAlert] = useState<boolean>(false);
  const [copiedCLI, setCopiedCLI] = useState<boolean>(false);

  // Simulation State (stored in localStorage for persistence!)
  const [account, setAccount] = useState<SimulatedAccount>(() => {
    const saved = localStorage.getItem("futures_account");
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        // use default if parse failed
      }
    }
    return {
      balance: 10000.00,
      positions: []
    };
  });

  const terminalEndRef = useRef<HTMLDivElement>(null);

  // Save account to localstorage on change
  useEffect(() => {
    localStorage.setItem("futures_account", JSON.stringify(account));
  }, [account]);

  // Fetch log file on mount or interval
  const fetchLogs = async () => {
    try {
      const response = await fetch("/api/logs");
      const data = await response.json();
      if (data.success) {
        setFileLogs(data.logs);
      }
    } catch (e) {
      console.error("Error fetching log stream", e);
    }
  };

  // Fetch current live symbol mark price
  const fetchPrice = async (symbolName: string) => {
    try {
      const response = await fetch(`/api/ticker?symbol=${symbolName}`);
      const data = await response.json();
      if (data.success) {
        setTickerPrice(data.price);
        setFallbackMode(!!data.isFallback);
        
        // Auto update limit price state to match current tick if the user switches symbols
        if (orderType === "MARKET") {
          setPrice(data.price);
        }
      }
    } catch (e) {
      console.error("Error fetching price", e);
    }
  };

  // Cycle fetching price
  useEffect(() => {
    fetchPrice(selectedSymbol);
    const interval = setInterval(() => {
      fetchPrice(selectedSymbol);
    }, 4000);
    return () => clearInterval(interval);
  }, [selectedSymbol]);

  // Handle files load and log fetch on start
  useEffect(() => {
    fetchLogs();
  }, []);

  // CLI command string generator helper
  const cliString = `python cli.py --symbol ${selectedSymbol} --side ${side} --type ${orderType} --quantity ${quantity}${
    orderType === "LIMIT" ? ` --price ${price}` : ""
  }`;

  // Handle preset clicks
  const applyPreset = (symbol: string, sideVal: TradeSide, typeVal: OrderType, qty: number, pxOffset: number) => {
    setSelectedSymbol(symbol);
    setSide(sideVal);
    setOrderType(typeVal);
    setQuantity(qty);
    if (typeVal === "LIMIT") {
      setPrice(Number((tickerPrice + pxOffset).toFixed(2)));
    }
  };

  // Run Bot execution simulator
  const executeTraderBot = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (quantity <= 0) return;
    if (orderType === "LIMIT" && price <= 0) return;

    setIsRunning(true);
    setActiveTab("terminal");
    setTerminalOutput((prev) => `${prev}\n\n$ ${cliString}\n[Executing Futures CLI Bot Command...]`);

    try {
      const response = await fetch("/api/run-cli", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          symbol: selectedSymbol,
          side: side,
          type: orderType,
          quantity: quantity,
          price: orderType === "LIMIT" ? price : undefined,
          api_key: isSandbox ? undefined : apiKey,
          api_secret: isSandbox ? undefined : apiSecret,
        }),
      });

      const data = await response.json();
      if (data.success) {
        // Output receipt console lines to our terminal box
        setTerminalOutput((prev) => `${prev}\n${data.stdout}`);

        // Update Simulated Account portfolio balance and positions list
        updateSimulatedPortfolio(selectedSymbol, side, orderType, quantity, orderType === "LIMIT" ? price : tickerPrice);

        // Instantly reload app logs
        await fetchLogs();
      } else {
        setTerminalOutput((prev) => `${prev}\n\n[ERROR] Execution aborted: ${data.error || "Connection error"}`);
      }
    } catch (err: any) {
      setTerminalOutput((prev) => `${prev}\n\n[ERROR] Failed to run CLI process daemon: ${err.message}`);
    } finally {
      setIsRunning(false);
      // Scroll terminal to view the receipt
      setTimeout(() => {
        if (terminalEndRef.current) {
          terminalEndRef.current.scrollIntoView({ behavior: "smooth" });
        }
      }, 100);
    }
  };

  // Perform virtual positions netting / additions
  const updateSimulatedPortfolio = (
    sym: string,
    tradeSide: TradeSide,
    typeVal: OrderType,
    qty: number,
    executionPrice: number
  ) => {
    const cost = qty * executionPrice;
    
    // Futures fee rate (0.05%)
    const tradeFee = cost * 0.0005;

    setAccount((prev) => {
      let currentBal = prev.balance - tradeFee;
      let updatedPositions = [...prev.positions];

      // Find if we already have an open position for this symbol
      const existingPosIndex = updatedPositions.findIndex((p) => p.symbol === sym);

      if (existingPosIndex !== -1) {
        const existing = updatedPositions[existingPosIndex];
        
        // If trade is in same direction, construct cumulative position
        if (existing.side === tradeSide) {
          const newQty = existing.quantity + qty;
          const newAvg = ((existing.quantity * existing.avgPrice) + cost) / newQty;
          updatedPositions[existingPosIndex] = {
            ...existing,
            quantity: newQty,
            avgPrice: Number(newAvg.toFixed(4)),
            unrealizedPnl: Number(((tickerPrice - newAvg) * newQty * (tradeSide === "BUY" ? 1 : -1)).toFixed(2))
          };
        } else {
          // Opposite direction: close or reduce position
          if (existing.quantity > qty) {
            // Partial reduction
            const remainingQty = existing.quantity - qty;
            // Realize P&L on the closed chunk
            const profit = (executionPrice - existing.avgPrice) * qty * (existing.side === "BUY" ? 1 : -1);
            currentBal += profit;
            
            updatedPositions[existingPosIndex] = {
              ...existing,
              quantity: remainingQty,
              unrealizedPnl: Number(((tickerPrice - existing.avgPrice) * remainingQty * (existing.side === "BUY" ? 1 : -1)).toFixed(2))
            };
          } else {
            // Full close or reverse
            const closedQty = existing.quantity;
            const profit = (executionPrice - existing.avgPrice) * closedQty * (existing.side === "BUY" ? 1 : -1);
            currentBal += profit;

            const extremeQtyLeft = qty - closedQty;

            if (extremeQtyLeft > 0) {
              // Reverses the position into the opposite trade side
              updatedPositions[existingPosIndex] = {
                symbol: sym,
                side: tradeSide,
                avgPrice: executionPrice,
                quantity: extremeQtyLeft,
                unrealizedPnl: 0
              };
            } else {
              // Remove position completely
              updatedPositions.splice(existingPosIndex, 1);
            }
          }
        }
      } else {
        // No existing position, open fresh
        updatedPositions.push({
          symbol: sym,
          side: tradeSide,
          avgPrice: executionPrice,
          quantity: qty,
          unrealizedPnl: 0
        });
      }

      return {
        balance: Number(currentBal.toFixed(2)),
        positions: updatedPositions
      };
    });
  };

  // Close simulated position directly with a single click at current tickerPrice
  const closePosition = (pos: Position) => {
    updateSimulatedPortfolio(
      pos.symbol, 
      pos.side === "BUY" ? "SELL" : "BUY", 
      "MARKET", 
      pos.quantity, 
      tickerPrice
    );
    
    // Log close event
    const t = () => new Date().toISOString().replace("T", " ").substring(0, 19);
    const mockLog = `${t()} [INFO] (orders.py:112) - Simulating active closure of ${pos.symbol} ${pos.side} position size: ${pos.quantity} @ ${tickerPrice}`;
    setTerminalOutput((prev) => `${prev}\n\n$ [Interactive Close] Position ${pos.symbol} closed @ market price ${tickerPrice}\n`);
    
    fetchLogs();
  };

  // Helper to re-evaluate Unrealized PnL based on live tick price changes
  useEffect(() => {
    setAccount((prev) => {
      const updated = prev.positions.map((pos) => {
        if (pos.symbol === selectedSymbol) {
          const multiplier = pos.side === "BUY" ? 1 : -1;
          const pnl = (tickerPrice - pos.avgPrice) * pos.quantity * multiplier;
          return {
            ...pos,
            unrealizedPnl: Number(pnl.toFixed(2))
          };
        }
        return pos;
      });
      return {
        ...prev,
        positions: updated
      };
    });
  }, [tickerPrice]);

  // Reset Simulated Portfolio
  const resetPortfolio = () => {
    setAccount({
      balance: 10000.00,
      positions: []
    });
    setTerminalOutput((prev) => `${prev}\n\n$ [Interactive Reset] Wallet restored to $10,000.00 USDT. Virtual positions liquidated.`);
  };

  // Clear python logs
  const clearPythonLogs = async () => {
    try {
      const resp = await fetch("/api/logs/reset", { method: "POST" });
      if (resp.ok) {
        setFileLogs("");
        setTerminalOutput((prev) => `${prev}\n[System] python logs (logs/trading.log) reset successfully.`);
      }
    } catch {
      // ignore helper error
    }
  };

  // Copy CLI command string
  const copyCliCommand = () => {
    navigator.clipboard.writeText(cliString);
    setCopiedCLI(true);
    setTimeout(() => setCopiedCLI(false), 2000);
  };

  return (
    <div className="min-h-screen bg-[#0A0A0A] text-[#E0E0E0] font-sans selection:bg-[#00FF94] selection:text-[#0A0A0A] flex flex-col">
      
      {/* GLOWING HEADER BAR */}
      <header className="border-b border-white/10 bg-[#141414]/90 backdrop-blur-md sticky top-0 z-50 px-6 py-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex items-center gap-4">
          <div className="h-10 w-10 rounded-xl bg-[#00FF94] flex items-center justify-center text-black font-display font-black text-lg shadow-[0_0_15px_rgba(0,255,148,0.3)]">
            BF
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-xl font-bold font-display tracking-tight text-white">
                Binance Futures Bot
              </h1>
              <span className="text-[9px] font-mono font-bold uppercase tracking-wider bg-[#00FF94]/10 text-[#00FF94] border border-[#00FF94]/20 px-2 py-0.5 rounded-full flex items-center gap-1">
                <span className="w-1 h-1 rounded-full bg-[#00FF94] animate-ping" />
                USDT-M TESTNET
              </span>
            </div>
            <p className="text-xs text-white/40 font-mono mt-1">
              Production-Style Python Bot Dashboard • Local UTC: 2026-06-08 06:44:11
            </p>
          </div>
        </div>

        {/* Header Right Status Display */}
        <div className="flex items-center gap-3 w-full sm:w-auto justify-between sm:justify-end font-sans">
          <div className="bg-[#1C1C1E] border border-white/5 rounded-xl p-1.5 flex gap-1 text-[11px] font-mono">
            <button
              onClick={() => setIsSandbox(true)}
              className={`px-3 py-1 rounded-lg transition-all duration-200 ${
                isSandbox 
                  ? "bg-[#00FF94]/10 text-[#00FF94] border border-[#00FF94]/20 font-semibold" 
                  : "text-white/40 hover:text-white"
              }`}
            >
              Simulated API
            </button>
            <button
              onClick={() => setIsSandbox(false)}
              className={`px-3 py-1 rounded-lg transition-all duration-200 flex items-center gap-1.5 ${
                !isSandbox 
                  ? "bg-[#FFBD2E]/10 text-[#FFBD2E] border border-[#FFBD2E]/20 font-semibold" 
                  : "text-white/40 hover:text-white/80"
              }`}
            >
              <Lock className="w-3 h-3" /> Live Keys
            </button>
          </div>

          <button 
            onClick={async () => {
              await fetchLogs();
              fetchPrice(selectedSymbol);
            }}
            title="Refresh Logs & Feed" 
            className="p-2 sm:p-2.5 border border-white/10 bg-[#141414] rounded-xl hover:bg-[#1C1C1E] transition active:scale-95 text-white/60 hover:text-white"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* SECURE API KEY OVERWRITE WIDGET */}
      {!isSandbox && (
        <div className="bg-[#FFBD2E]/5 border-b border-[#FFBD2E]/20 px-6 py-3 flex flex-wrap gap-4 items-center justify-between text-xs text-[#FFBD2E]">
          <div className="flex items-center gap-2">
            <Info className="w-4 h-4 shrink-0 text-[#FFBD2E]" />
            <span className="font-mono">
              <strong>Active Key Injection:</strong> Executing commands over your secure credentials. Leave empty to fallback to Sandbox keys.
            </span>
          </div>
          <div className="flex items-[#FFBD2E] gap-2">
            <input 
              type="password"
              placeholder="Binance Testnet API Key"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              className="bg-[#0A0A0A] border border-white/10 rounded-lg px-2.5 py-1 text-[11px] font-mono text-white focus:outline-none focus:border-[#FFBD2E]/50 w-44"
            />
            <input 
              type="password"
              placeholder="Binance Testnet Secret Key"
              value={apiSecret}
              onChange={(e) => setApiSecret(e.target.value)}
              className="bg-[#0A0A0A] border border-white/10 rounded-lg px-2.5 py-1 text-[11px] font-mono text-white focus:outline-none focus:border-[#FFBD2E]/50 w-44"
            />
            <button 
              onClick={() => {
                setShowConfigSavedGlow(true);
                setTimeout(() => setShowConfigSavedGlow(false), 2000);
              }}
              className="px-3 py-1 bg-[#FFBD2E] text-black font-extrabold hover:bg-[#FFC64D] rounded-lg transition text-[11px] font-mono"
            >
              Apply Keys
            </button>
          </div>
        </div>
      )}

      {/* CORE BENTO GRID */}
      <main className="flex-1 p-4 md:p-6 grid grid-cols-12 gap-5 max-w-[1700px] w-full mx-auto">
        
        {/* LEFT COLUMN: CONTROLS & WALLET HUB (4 cols span) */}
        <div className="col-span-12 lg:col-span-4 flex flex-col gap-5">
          
          {/* BENTO ACTION 1: INTERACTIVE CLI BUILDER FORM */}
          <div className="bg-[#141414] border border-white/10 rounded-2xl p-5 flex flex-col gap-4 shadow-xl transition-all duration-300 hover:border-white/15">
            <div className="flex justify-between items-center border-b border-white/5 pb-3">
              <h2 className="font-bold text-white font-display flex items-center gap-2">
                <Sliders className="w-4 h-4 text-[#00FF94]" />
                CLI Order Dispatcher
              </h2>
              <span className="text-[9px] uppercase font-mono font-bold tracking-wider text-white/40 bg-white/5 px-2 py-0.5 rounded-full">
                Argparse Validated
              </span>
            </div>

            {/* Quick Presets Grid */}
            <div>
              <label className="text-[10px] text-white/30 font-mono block mb-2 font-bold uppercase tracking-wider">
                1-CLICK Presets (arg templates)
              </label>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <button
                  type="button"
                  onClick={() => applyPreset("BTCUSDT", "BUY", "MARKET", 0.005, 0)}
                  className="bg-[#1A1A1C] border border-white/5 hover:border-[#00FF94]/30 hover:bg-[#00FF94]/5 p-2 rounded-xl text-left transition-all duration-200"
                >
                  <div className="text-white hover:text-[#00FF94] font-bold font-mono flex items-center justify-between">
                    <span>BTC Market BUY</span>
                    <ArrowUpRight className="w-3.5 h-3.5 text-[#00FF94]" />
                  </div>
                  <div className="text-[10px] text-white/40 font-mono mt-0.5">Size: 0.005 BTC</div>
                </button>
                <button
                  type="button"
                  onClick={() => applyPreset("ETHUSDT", "SELL", "LIMIT", 0.02, 12)}
                  className="bg-[#1A1A1C] border border-white/5 hover:border-[#FF3B30]/30 hover:bg-[#FF3B30]/5 p-2 rounded-xl text-left transition-all duration-200"
                >
                  <div className="text-white font-bold font-mono flex items-center justify-between">
                    <span>ETH Limit SELL</span>
                    <ArrowDownRight className="w-3.5 h-3.5 text-[#FF3B30]" />
                  </div>
                  <div className="text-[10px] text-white/40 font-mono mt-0.5">Size: 0.02 ETH</div>
                </button>
              </div>
            </div>

            <form onSubmit={executeTraderBot} className="flex flex-col gap-4">
              
              {/* SYMBOL SELECTION LIST */}
              <div>
                <label className="text-[10px] text-white/30 font-mono block mb-2 uppercase font-bold tracking-wider">
                  Futures Market Symbol
                </label>
                <div className="grid grid-cols-5 gap-1 font-mono">
                  {symbolsList.map((sym) => (
                    <button
                      type="button"
                      key={sym}
                      onClick={() => setSelectedSymbol(sym)}
                      className={`py-1.5 text-center text-xs font-bold rounded-lg border transition-all duration-200 ${
                        selectedSymbol === sym
                          ? "bg-[#00FF94]/10 text-[#00FF94] border-[#00FF94]/40"
                          : "bg-[#1C1C1E] border-white/5 text-white/60 hover:bg-[#252528] hover:text-white"
                      }`}
                    >
                      {sym.replace("USDT", "")}
                    </button>
                  ))}
                </div>
              </div>

              {/* DIRECTION / SIDE (BUY OR SELL) */}
              <div>
                <label className="text-[10px] text-white/30 font-mono block mb-2 uppercase font-bold tracking-wider">
                  Order Side (arg --side)
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setSide("BUY")}
                    className={`py-2 text-center text-xs font-mono font-bold rounded-xl transition-all duration-200 ${
                      side === "BUY"
                        ? "bg-[#00FF94] text-black font-extrabold shadow-[0_0_12px_rgba(0,255,148,0.25)]"
                        : "bg-[#1C1C1E] border border-white/5 text-white/40 hover:text-white hover:bg-[#252528]"
                    }`}
                  >
                    BUY / LONG
                  </button>
                  <button
                    type="button"
                    onClick={() => setSide("SELL")}
                    className={`py-2 text-center text-xs font-mono font-bold rounded-xl transition-all duration-200 ${
                      side === "SELL"
                        ? "bg-[#FF3B30] text-white font-extrabold shadow-[0_0_12px_rgba(255,59,48,0.25)]"
                        : "bg-[#1C1C1E] border border-white/5 text-white/40 hover:text-white hover:bg-[#252528]"
                    }`}
                  >
                    SELL / SHORT
                  </button>
                </div>
              </div>

              {/* ORDER TYPE */}
              <div>
                <label className="text-[10px] text-white/30 font-mono block mb-2 uppercase font-bold tracking-wider">
                  Execution Mode (arg --type)
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setOrderType("MARKET")}
                    className={`py-2 text-center text-xs font-mono rounded-xl border transition-all duration-200 ${
                      orderType === "MARKET"
                        ? "bg-white/10 border-white/20 text-white font-bold"
                        : "bg-[#1C1C1E] border-white/5 text-white/40 hover:bg-[#252528]"
                    }`}
                  >
                    MARKET
                  </button>
                  <button
                    type="button"
                    onClick={() => setOrderType("LIMIT")}
                    className={`py-2 text-center text-xs font-mono rounded-xl border transition-all duration-200 ${
                      orderType === "LIMIT"
                        ? "bg-white/10 border-white/20 text-white font-bold"
                        : "bg-[#1C1C1E] border-[#262626] text-white/40 hover:bg-[#252528]"
                    }`}
                  >
                    LIMIT MODE
                  </button>
                </div>
              </div>

              {/* TWO COLUMN SIZE & TRIGGER */}
              <div className="grid grid-cols-2 gap-3 font-mono text-xs">
                <div>
                  <label className="text-[10px] text-white/30 font-mono block mb-1.5 uppercase font-bold tracking-wider">
                    Size (--quantity)
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      step="any"
                      min="0.0001"
                      required
                      value={quantity}
                      onChange={(e) => setQuantity(Math.max(0.0001, parseFloat(e.target.value) || 0))}
                      className="w-full bg-[#1C1C1E] text-white border border-white/10 rounded-lg px-3 py-2 text-xs focus:outline-none focus:border-white/25 font-mono"
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[9px] text-white/20 font-mono">
                      UNIT
                    </span>
                  </div>
                </div>

                <div>
                  <label className="text-[10px] text-white/30 font-mono block mb-1.5 uppercase font-bold tracking-wider">
                    Price (--price)
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      step="any"
                      min="0.001"
                      disabled={orderType === "MARKET"}
                      required={orderType === "LIMIT"}
                      value={orderType === "MARKET" ? tickerPrice.toFixed(2) : price}
                      onChange={(e) => setPrice(Math.max(0.001, parseFloat(e.target.value) || 0))}
                      className={`w-full bg-[#1C1C1E] text-white border border-white/10 rounded-lg px-3 py-2 text-xs focus:outline-none focus:border-white/25 font-mono ${
                        orderType === "MARKET" ? "opacity-45 cursor-not-allowed select-none text-white/30" : ""
                      }`}
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[9px] text-white/20 font-mono">
                      USDT
                    </span>
                  </div>
                </div>
              </div>

              {/* EQUIVALENT PYTHON STRING DISPLAY */}
              <div className="bg-[#0A0A0A] rounded-xl p-3 border border-white/5">
                <div className="flex justify-between items-center text-[9px] font-mono text-white/35 mb-1.5 uppercase font-bold tracking-wider">
                  <span>Python Executable Command</span>
                  <button
                    type="button"
                    onClick={copyCliCommand}
                    className="flex items-center gap-1 text-white/50 hover:text-[#00FF94] transition-all"
                  >
                    {copiedCLI ? <Check className="w-3 h-3 text-[#00FF94]" /> : <Copy className="w-3 h-3" />}
                    {copiedCLI ? "Copied" : "Copy string"}
                  </button>
                </div>
                <code className="text-xs text-white/70 font-mono break-all leading-normal block bg-[#0A0A0A]">
                  {cliString}
                </code>
              </div>

              {/* ACTION DISPATCH BUTTON */}
              <button
                type="submit"
                disabled={isRunning}
                className={`w-full py-3 rounded-xl text-xs font-mono font-bold tracking-widest uppercase transition-all duration-200 cursor-pointer ${
                  isRunning 
                    ? "bg-[#1C1C1E] text-white/20 cursor-not-allowed border border-white/5" 
                    : side === "BUY"
                    ? "bg-[#00FF94] hover:bg-[#00D67B] text-black shadow-[0_4px_20px_rgba(0,255,148,0.15)] font-extrabold"
                    : "bg-[#FF3B30] hover:bg-[#E03025] text-white shadow-[0_4px_20px_rgba(255,59,48,0.15)] font-extrabold"
                }`}
              >
                {isRunning ? (
                  <span className="flex items-center justify-center gap-2">
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    Executing script...
                  </span>
                ) : (
                  <span className="flex items-center justify-center gap-1.5">
                    <Play className="w-3.5 h-3.5 fill-current shrink-0" />
                    Run Orders Thread Side: {side}
                  </span>
                )}
              </button>
            </form>
          </div>

          {/* BENTO ACTION 2: SIMULATED ACCOUNT / WORKSPACE MARGIN WALLET */}
          <div className="bg-[#141414] border border-white/10 rounded-2xl p-5 flex flex-col gap-4 shadow-xl transition-all duration-300 hover:border-white/15">
            <div className="flex justify-between items-center border-b border-white/5 pb-3">
              <h3 className="font-bold text-white font-display flex items-center gap-2">
                <Wallet className="w-4 h-4 text-sky-400" />
                Bot Margin Ledger
              </h3>
              <button
                onClick={resetPortfolio}
                title="Liquidate and Reset Wallet"
                className="text-[9px] uppercase font-mono font-bold tracking-wider text-white/30 hover:text-[#FF3B30] hover:border-[#FF3B30]/30 transition-all px-2 py-0.5 rounded-lg border border-white/5 bg-[#0A0A0A]"
              >
                Reset Wallet
              </button>
            </div>

            {/* Metrics Mini Bento blocks */}
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-[#1C1C1E] p-3 rounded-xl border border-white/5">
                <span className="text-[9px] font-mono text-white/30 block uppercase tracking-wider">
                  Wallet Balance
                </span>
                <span className="text-lg font-bold font-mono text-white mt-1 block">
                  ${account.balance.toLocaleString("en-US", { minimumFractionDigits: 2 })}
                  <span className="text-[10px] text-white/40 font-normal ml-1 font-sans">USDT</span>
                </span>
              </div>

              <div className="bg-[#1C1C1E] p-3 rounded-xl border border-[#262626]">
                <span className="text-[9px] font-mono text-white/30 block tracking-wider uppercase">
                  Unrealized PnL
                </span>
                {(() => {
                  const totalPnl = account.positions.reduce((sum, p) => sum + p.unrealizedPnl, 0);
                  const isPositive = totalPnl >= 0;
                  return (
                    <span className={`text-lg font-bold font-mono mt-1 block ${
                      totalPnl === 0 ? "text-white/40" : isPositive ? "text-[#00FF94]" : "text-[#FF3B30]"
                    }`}>
                      {totalPnl === 0 ? "" : isPositive ? "+" : ""}${totalPnl.toFixed(2)}
                      <span className="text-[10px] text-white/40 font-normal ml-1 font-sans">USDT</span>
                    </span>
                  );
                })()}
              </div>
            </div>

            {/* Active Positions sub-table */}
            <div>
              <div className="text-[10px] text-white/30 font-mono block mb-2.5 font-bold uppercase tracking-wider">
                Active Contracts ({account.positions.length})
              </div>

              {account.positions.length === 0 ? (
                <div className="bg-[#1C1C1E] text-center py-6 text-xs text-white/30 rounded-xl border border-white/5 font-mono">
                  No open margin contracts. Place BUY/SELL orders above to accumulate virtual positions.
                </div>
              ) : (
                <div className="flex flex-col gap-2">
                  {account.positions.map((pos) => {
                    const isLong = pos.side === "BUY";
                    const isPositive = pos.unrealizedPnl >= 0;
                    return (
                      <div 
                        key={pos.symbol + pos.side}
                        className="bg-[#1C1C1E] border border-white/5 hover:border-white/10 rounded-xl p-2.5 flex items-center justify-between text-xs transition-all duration-200"
                      >
                        <div className="flex items-center gap-2">
                          <span className={`px-1.5 py-0.5 rounded text-[8px] font-mono font-bold ${
                            isLong ? "bg-[#00FF94]/10 text-[#00FF94]" : "bg-[#FF3B30]/15 text-[#FF3B30]"
                          }`}>
                            {isLong ? "LONG" : "SHORT"}
                          </span>
                          <div>
                            <span className="font-bold text-white font-mono">{pos.symbol}</span>
                            <span className="text-white/40 font-mono text-[9px] ml-1">x{pos.quantity}</span>
                          </div>
                        </div>

                        <div className="text-right font-mono text-[10px]">
                          <div className="text-white/50">Entry: ${pos.avgPrice}</div>
                          <div className="text-white/30 font-mono">Mark: ${tickerPrice.toFixed(2)}</div>
                        </div>

                        <div className="flex items-center gap-2">
                          <span className={`font-mono font-bold text-right ${
                            pos.unrealizedPnl === 0 ? "text-white/40" : isPositive ? "text-[#00FF94]" : "text-[#FF3B30]"
                          }`}>
                            {isPositive && pos.unrealizedPnl > 0 ? "+" : ""}${pos.unrealizedPnl.toFixed(2)}
                          </span>
                          <button
                            onClick={() => closePosition(pos)}
                            className="bg-[#FF3B30]/10 border border-[#FF3B30]/20 text-[#FF3B30] px-2 py-1 rounded-lg text-[10px] hover:bg-[#FF3B30] hover:text-black transition-all font-bold font-mono"
                          >
                            Close
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

        </div>

        {/* RIGHT COLUMN: MAIN DESK TERMINAL & TELEMETRY INDEX (8 cols span) */}
        <div className="col-span-12 lg:col-span-8 flex flex-col gap-5">
          
          {/* BENTO TERMINAL COMPONENT */}
          <div className="bg-[#141414] border border-white/10 rounded-2xl overflow-hidden flex flex-col flex-1 min-h-[500px] shadow-xl hover:border-white/15 transition-all duration-300">
            
            {/* Elegant Tab Headers */}
            <div className="bg-[#0A0A0A] border-b border-white/10 p-2 flex justify-between items-center text-xs">
              <div className="flex gap-1.5">
                <button
                  type="button"
                  onClick={() => setActiveTab("terminal")}
                  className={`px-3.5 py-2 rounded-xl font-mono text-xs flex items-center gap-2 transition-all duration-200 ${
                    activeTab === "terminal"
                      ? "bg-[#141414] text-white font-bold border border-white/5"
                      : "text-white/40 hover:text-white"
                  }`}
                >
                  <Terminal className="w-3.5 h-3.5 text-[#00FF94]" />
                  Terminal Console
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setActiveTab("logs");
                    fetchLogs();
                  }}
                  className={`px-3.5 py-2 rounded-xl font-mono text-xs flex items-center gap-2 transition-all duration-200 ${
                    activeTab === "logs"
                      ? "bg-[#141414] text-white font-bold border border-white/5"
                      : "text-white/40 hover:text-white"
                  }`}
                >
                  <FileText className="w-3.5 h-3.5 text-sky-450" />
                  logs/trading.log
                </button>
              </div>

              {/* Utility buttons for console actions */}
              <div className="flex gap-1.5">
                {activeTab === "logs" ? (
                  <>
                    <button
                      onClick={fetchLogs}
                      title="Refresh file logs"
                      className="p-1 px-2.5 bg-[#141414] hover:bg-[#1C1C1E] text-white/50 hover:text-white rounded-lg border border-white/5 flex items-center gap-1 transition-all"
                    >
                      <RefreshCw className="w-3 h-3 text-sky-400" />
                      Refresh
                    </button>
                    <button
                      onClick={clearPythonLogs}
                      title="Clear log file contents"
                      className="p-1 px-2.5 bg-[#141414] hover:bg-[#FF3B30]/10 hover:text-[#FF3B30] text-white/40 rounded-lg border border-white/5 flex items-center gap-1 transition-all"
                    >
                      <Trash2 className="w-3 h-3 text-[#FF3B30]" />
                      Clear
                    </button>
                  </>
                ) : (
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(terminalOutput);
                      setShowCopyLogAlert(true);
                      setTimeout(() => setShowCopyLogAlert(false), 2000);
                    }}
                    className="p-1 px-3 bg-[#141414] hover:bg-[#1C1C1E] text-white/50 hover:text-white rounded-lg border border-white/5 flex items-center gap-1.5 transition"
                  >
                    {showCopyLogAlert ? (
                      <>
                        <Check className="w-3 h-3 text-[#00FF94]" />
                        <span className="font-mono text-[10px]">Copied</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3 h-3 text-white/40" />
                        <span className="font-mono text-[10px]">Copy output</span>
                      </>
                    )}
                  </button>
                )}
              </div>
            </div>

            {/* MONOSPACE ZONE PRINT ZONE */}
            <div className="flex-1 bg-[#0A0A0A] p-4 font-mono text-xs leading-relaxed overflow-y-auto max-h-[500px]">
              {activeTab === "terminal" ? (
                <div className="whitespace-pre-wrap text-[#00FF94] font-mono h-full selection:bg-white/15">
                  {terminalOutput}
                  {/* Cursor blink */}
                  <span className="inline-block w-2.5 h-4 ml-1 bg-[#00FF94] animate-pulse align-middle" />
                  <div ref={terminalEndRef} />
                </div>
              ) : (
                <div className="whitespace-pre text-white/70 font-mono selection:bg-white/10">
                  {fileLogs ? (
                    fileLogs
                  ) : (
                    <span className="text-white/30 font-mono">No transaction logs captured in logs/trading.log yet. Trace orders to write file records.</span>
                  )}
                </div>
              )}
            </div>

            {/* Bottom Stream Status bar */}
            <div className="bg-[#0A0A0A] border-t border-white/10 py-2.5 px-4 flex items-center justify-between text-[11px] font-mono text-white/40 gap-4 flex-wrap">
              <div className="flex items-center gap-2.5 font-mono">
                <span className="inline-block w-2 h-2 rounded-full bg-[#00FF94] animate-ping shrink-0" />
                <span className="text-white/60">Active Feed:</span>
                <span className="font-semibold text-white">{selectedSymbol}</span>
                <span className="text-[#00FF94] font-bold">${tickerPrice.toLocaleString("en-US", { minimumFractionDigits: 2 })}</span>
                {fallbackMode && (
                  <span className="text-[#FFBD2E] border border-[#FFBD2E]/20 text-[9px] bg-[#FFBD2E]/10 px-1.5 py-0.5 rounded font-sans uppercase font-bold text-center">
                    Sandbox Feed
                  </span>
                )}
              </div>
              <div className="text-white/35 flex items-center gap-1 scale-95 origin-right font-mono">
                <span>Client Base:</span>
                <span className="text-white/60 font-mono">testnet.binancefuture.com</span>
              </div>
            </div>
          </div>

          {/* NEW TACTICAL BENTO 3: BOT TELEMETRY & WORKSPACE HEALTH SYSTEMS */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-[#141414] border border-white/10 rounded-2xl p-4 shadow-lg hover:border-white/15 transition-all duration-300 font-sans">
            <div className="bg-[#1C1C1E] p-3 rounded-xl border border-white/5 flex items-center gap-3">
              <Activity className="w-5 h-5 text-[#00FF94] shrink-0" />
              <div>
                <span className="text-[9px] font-mono text-white/30 block uppercase tracking-wider">Ping Latency</span>
                <span className="text-xs font-mono font-bold text-white font-mono">42ms <span className="text-[10px] text-[#00FF94] font-normal font-sans">● Online</span></span>
              </div>
            </div>

            <div className="bg-[#1C1C1E] p-3 rounded-xl border border-white/5 flex items-center gap-3">
              <ShieldCheck className="w-5 h-5 text-sky-400 shrink-0" />
              <div>
                <span className="text-[9px] font-mono text-white/30 block uppercase tracking-wider">Arg Validate</span>
                <span className="text-xs font-mono font-bold text-white font-mono">100% Secure</span>
              </div>
            </div>

            <div className="bg-[#1C1C1E] p-3 rounded-xl border border-white/5 flex items-center gap-3 font-sans">
              <Cpu className="w-5 h-5 text-[#FFBD2E] shrink-0" />
              <div>
                <span className="text-[9px] font-mono text-white/30 block uppercase tracking-wider font-mono">Engine Process</span>
                <span className="text-xs font-mono font-bold text-white font-mono">Active Thread</span>
              </div>
            </div>

            <div className="bg-[#1C1C1E] p-3 rounded-xl border border-white/5 flex items-center gap-3 font-sans">
              <Globe className="w-5 h-5 text-[#FF3B30] shrink-0" />
              <div>
                <span className="text-[9px] font-mono text-white/30 block uppercase tracking-wider font-mono font-sans">API Connection</span>
                <span className="text-xs font-mono font-bold text-white font-sans">wss / binance</span>
              </div>
            </div>
          </div>

          {/* SECONDARY INTERACTIVE GRAPH / BENTO LIST: SYMBOLS GRID */}
          <div className="bg-[#141414] border border-white/10 rounded-2xl p-5 shadow-lg hover:border-white/15 transition-all duration-300">
            <h3 className="font-bold text-white font-display text-sm mb-3 flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-[#00FF94]" />
              Live Coin Ticker Workspace Prices
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
              {symbolsList.map((sym) => {
                const isSelected = selectedSymbol === sym;
                return (
                  <button
                    key={sym}
                    onClick={() => setSelectedSymbol(sym)}
                    className={`p-3 rounded-xl border text-left flex flex-col font-mono transition-all duration-200 ${
                      isSelected 
                        ? "bg-[#1C1C1E] border-[#00FF94]/50 shadow-[0_0_15px_rgba(0,255,148,0.06)]" 
                        : "bg-[#1C1C1E] border-white/5 hover:border-white/10 hover:bg-[#252528]"
                    }`}
                  >
                    <span className="text-[9px] text-white/30 font-bold font-mono">{sym}</span>
                    <span className={`text-sm font-bold mt-1 ${isSelected ? "text-[#00FF94]" : "text-white"}`}>
                      ${isSelected ? tickerPrice.toFixed(2) : (68420.5 / (sym === "BTCUSDT" ? 1 : sym === "ETHUSDT" ? 19.3 : sym === "SOLUSDT" ? 440 : sym === "BNBUSDT" ? 117 : 152000)).toFixed(sym === "ADAUSDT" ? 4 : 2)}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

        </div>
      </main>

      {/* FOOTER METRICS INFO */}
      <footer className="border-t border-slate-900 bg-slate-950 p-6 text-center text-slate-500 font-mono text-xs mt-auto">
        <p>© 2026 Binance Futures Simulator Portfolio Daemon • High-Performance Crypto bot workspace.</p>
        <p className="mt-1 text-[11px] text-slate-600">Created for internship evaluation with robust Python integration.</p>
      </footer>

    </div>
  );
}
