import logging
from bot.client import BinanceFuturesClient
from binance.exceptions import BinanceAPIException, BinanceRequestException

logger = logging.getLogger('trading_bot')

def execute_order(client: BinanceFuturesClient, symbol: str, side: str, order_type: str, quantity: float, price: float = None):
    """
    Executes the futures order and prints formatted summaries before and after execution.
    """
    symbol_upper = symbol.strip().upper()
    side_upper = side.strip().upper()
    type_upper = order_type.strip().upper()

    # --- 1. Before Order Summary ---
    print("\n" + "="*50)
    print("                ORDER SUMMARY BEFORE PLACEMENT     ")
    print("="*50)
    print(f"  Symbol:        {symbol_upper}")
    print(f"  Side:          {side_upper}")
    print(f"  Order Type:    {type_upper}")
    print(f"  Quantity:      {quantity}")
    if type_upper == 'LIMIT':
        print(f"  Limit Price:   {price}")
    print("="*50)
    
    logger.info(f"Preparing to place order: {side_upper} {quantity} {symbol_upper} {type_upper} (Price: {price if price else 'MARKET'})")

    # --- 2. Action ---
    try:
        response = client.create_futures_order(
            symbol=symbol_upper,
            side=side_upper,
            order_type=type_upper,
            quantity=quantity,
            price=price
        )
        
        # --- 3. After Order Summary (Receipt) ---
        order_id = response.get('orderId', 'N/A')
        status = response.get('status', 'N/A')
        executed_qty = response.get('executedQty', '0')
        
        # In Binance Futures, average Price can be stored in 'avgPrice' or computed from cumulative fields
        avg_price = response.get('avgPrice')
        if not avg_price or float(avg_price) == 0:
            # Fallback if avgPrice is empty, try to get from price or fill trades
            avg_price = response.get('price', 'N/A')
            
        print("\n" + "="*50)
        print("                ORDER RECEIPT (SUCCESS)            ")
        print("="*50)
        print(f"  Order ID:          {order_id}")
        print(f"  Status:            {status}")
        print(f"  Executed Quantity: {executed_qty}")
        print(f"  Average Price:     {avg_price}")
        print("="*50 + "\n")
        
        logger.info(f"Order executed successfully. ID: {order_id}, Status: {status}, Executed Qty: {executed_qty}")
        return response

    except BinanceAPIException as e:
        print("\n" + "!"*50)
        print("                ORDER EXECUTION FAILED             ")
        print("!"*50)
        print(f"  Error Type:    Binance API Error")
        print(f"  Code:          {e.code}")
        print(f"  Message:       {e.message}")
        print("!"*50 + "\n")
        logger.error(f"Execution failed due to Binance API Error: Code {e.code} - {e.message}")
        raise e
    except BinanceRequestException as e:
        print("\n" + "!"*50)
        print("                ORDER EXECUTION FAILED             ")
        print("!"*50)
        print(f"  Error Type:    Binance Request Error")
        print(f"  Details:       {e}")
        print("!"*50 + "\n")
        logger.error(f"Execution failed due to Binance Request network issue: {e}")
        raise e
    except Exception as e:
        print("\n" + "!"*50)
        print("                ORDER EXECUTION FAILED             ")
        print("!"*50)
        print(f"  Error Type:    Unexpected Client Exception")
        print(f"  Details:       {e}")
        print("!"*50 + "\n")
        logger.error(f"Execution failed due to unexpected error: {e}")
        raise e
