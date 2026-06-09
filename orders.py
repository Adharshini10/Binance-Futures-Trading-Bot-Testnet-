import re

def validate_inputs(symbol: str, side: str, order_type: str, quantity: float, price: float = None):
    """
    Validates user input arguments for placing a Binance Futures order.
    Returns: Tuple[bool, str] -> (is_valid, error_message)
    """
    # 1. Validate Symbol
    if not symbol or not isinstance(symbol, str):
        return False, "Symbol must be a non-empty string."
    
    symbol_upper = symbol.strip().upper()
    if not re.match(r'^[A-Z0-9-]{5,15}$', symbol_upper):
        return False, f"Invalid symbol format: '{symbol}'. Must be 5-15 alphanumeric characters (e.g., BTCUSDT)."

    # 2. Validate Side
    side_upper = side.strip().upper()
    if side_upper not in ['BUY', 'SELL']:
        return False, f"Invalid side: '{side}'. Must be 'BUY' or 'SELL'."

    # 3. Validate Order Type
    type_upper = order_type.strip().upper()
    if type_upper not in ['MARKET', 'LIMIT']:
        return False, f"Invalid order type: '{order_type}'. Must be 'MARKET' or 'LIMIT'."

    # 4. Validate Quantity
    if quantity <= 0:
        return False, f"Quantity must be a positive number (got: {quantity})."

    # 5. Validate Price for LIMIT orders
    if type_upper == 'LIMIT':
        if price is None:
            return False, "Price (--price) is required for 'LIMIT' orders."
        if price <= 0:
            return False, f"Price must be a positive number for LIMIT orders (got: {price})."

    return True, ""
