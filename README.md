python-binance==1.0.19
python-dotenv==1.0.1
urllib3<2.0.0
# 📊 Binance Futures Trading Bot (Testnet)

A simple Python-based CLI trading bot that interacts with **Binance Futures USDT-M Testnet** to place **MARKET** and **LIMIT** orders.
This project is built with clean architecture, proper validation, logging, and error handling.

---

# 🚀 Features

* Place MARKET orders (BUY / SELL)
* Place LIMIT orders (BUY / SELL)
* CLI-based user input (argparse)
* Input validation for all parameters
* Structured logging system
* Error handling for API and invalid inputs
* Modular project structure

---

# 🧱 Project Structure

```
trading_bot/
│
├── bot/
│   ├── client.py           # Binance API connection layer
│   ├── orders.py           # Order execution logic
│   ├── validators.py       # Input validation
│   ├── logging_config.py   # Logging setup
│
├── logs/
│   └── trading.log         # Auto-generated logs
│
├── cli.py                  # Main entry point
├── requirements.txt
├── .env
└── README.md
```

---

# ⚙️ Setup Instructions

## 1. Clone or extract project

```bash
git clone <your-repo-url>
cd trading_bot
```

---

## 2. Create virtual environment (recommended)

```bash
python -m venv venv
```

Activate:

### Windows:

```bash
venv\Scripts\activate
```

### Mac/Linux:

```bash
source venv/bin/activate
```

---

## 3. Install dependencies

```bash
pip install -r requirements.txt
```

---

## 4. Setup environment variables

Create a `.env` file in root directory:

```env
API_KEY=your_binance_testnet_api_key
API_SECRET=your_binance_testnet_secret_key
```

👉 Get keys from:
https://testnet.binancefuture.com

---

# ▶️ How to Run the Project

Run all commands from the root folder.

---

## 📌 1. MARKET ORDER Example

### Buy Order

```bash
python cli.py --symbol BTCUSDT --side BUY --type MARKET --quantity 0.001
```

### Sell Order

```bash
python cli.py --symbol BTCUSDT --side SELL --type MARKET --quantity 0.001
```

---

## 📌 2. LIMIT ORDER Example

### Buy Limit Order

```bash
python cli.py --symbol BTCUSDT --side BUY --type LIMIT --quantity 0.001 --price 50000
```

### Sell Limit Order

```bash
python cli.py --symbol BTCUSDT --side SELL --type LIMIT --quantity 0.001 --price 60000
```





# 📁 Logs

All logs are stored in:

```
logs/trading.log
```

Includes:

* API requests
* API responses
* Errors
* Order status updates

---

# ⚠️ Assumptions

* This project uses **Binance Futures Testnet only (no real money trading)**
* Only USDT-M futures trading is supported
* Symbols must be valid Binance futures pairs (e.g., BTCUSDT)
* LIMIT orders require a valid price value
* Quantity must be greater than 0
* API keys must be valid and active from Binance testnet
* Internet connection is required for API calls

---

# ❗ Error Handling Covered

* Invalid symbol
* Invalid side (only BUY/SELL allowed)
* Invalid order type (only MARKET/LIMIT)
* Missing price for LIMIT order
* Network/API failures
* Invalid quantity values

---

# 🧠 Tech Stack

* Python 3.x
* python-binance
* python-dotenv
* argparse
* logging module

---

# 📌 Notes

* This project is designed for internship evaluation purposes
* Code is modular and production-style
* Easily extendable for advanced trading strategies

---

# 👨‍💻 Author

Built as part of a Python Developer Assignment for Binance Futures Trading Bot.## 🎥 Demo

### Screen Recording

Watch the project in action:

**Demo Video:**  
https://drive.google.com/file/d/16PZELOvl8Iw8Z1CA4bfFaixlerwbA_-Z/view?usp=sharing

This video demonstrates:

- MARKET order placement
- LIMIT order placement
- Input validation
- Logging and error handling

---

## 🌐 Interactive Workspace Preview

Explore the project workspace:

**Workspace Link:**  
https://aistudio.google.com/apps/32566188-bead-4dec-92fa-f655d2b20d3c?fullscreenApplet=true&showPreview=true&showAssistant=true

> **Note:** This is a shared interactive development workspace for previewing the project structure and source code. The trading bot itself is a CLI-based application and runs locally using the setup and execution instructions provided below.

---

## 📂 GitHub Repository

**Source Code:**  
https://aistudio.google.com/apps/32566188-bead-4dec-92fa-f655d2b20d3c?fullscreenApplet=true&showPreview=true&showAssistant=true


