import logging
from binance.client import Client
from binance.exceptions import BinanceAPIException, BinanceRequestException

logger = logging.getLogger('trading_bot')

class BinanceFuturesClient:
    def __init__(self, api_key: str, api_secret: str):
        """Initializes the Binance client targeting USDT-M Futures Testnet."""
        if not api_key or not api_secret:
            raise ValueError("API_KEY and API_SECRET are required to initialize the Binance client.")
        
        self.api_key = api_key
        self.api_secret = api_secret
        
        # Testnet URL config or testnet=True flag handles redirecting endpoints to Testnet.
        # Passing testnet=True redirects all standard APIs (Spot, Futures, Margin) to testnets.
        self.client = Client(api_key=self.api_key, api_secret=self.api_secret, testnet=True)
        # Verify connectivity and log success
        logger.debug("BinanceFuturesClient initialized with Testnet mode enabled.")

    def get_symbol_price(self, symbol: str) -> float:
        """Fetches the latest mark price for a futures ticker symbol."""
        try:
            symbol = symbol.upper()
            price_info = self.client.futures_symbol_ticker(symbol=symbol)
            price = float(price_info['price'])
            logger.info(f"Fetched latest Futures price for {symbol}: {price}")
            return price
        except BinanceAPIException as e:
            logger.error(f"Binance API Error fetching price for {symbol}: {e.message} (Code: {e.code})")
            raise
        except BinanceRequestException as e:
            logger.error(f"Binance Request Error fetching price for {symbol}: {e}")
            raise
        except Exception as e:
            logger.critical(f"Unexpected exception while fetching price for {symbol}: {e}")
            raise

    def create_futures_order(self, symbol: str, side: str, order_type: str, quantity: float, price: float = None):
        """
        Creates a MARKET or LIMIT order on USDT-M Futures Testnet.
        :param symbol: Symbol name (e.g. BTCUSDT)
        :param side: BUY or SELL
        :param order_type: MARKET or LIMIT
        :param quantity: Quantity of asset to trade
        :param price: Price (only used/required for LIMIT orders)
        """
        try:
            symbol = symbol.upper()
            side = side.upper()
            order_type = order_type.upper()

            # Prepare parameters
            params = {
                'symbol': symbol,
                'side': side,
                'type': order_type,
                'quantity': quantity
            }

            if order_type == 'LIMIT':
                # Limit orders require price and timeInForce (typically GTC - Good 'Til Cancelled)
                params['price'] = str(price)
                params['timeInForce'] = 'GTC'

            logger.info(f"Sending order request: {side} {quantity} {symbol} ({order_type} @ {price if price else 'MARKET'})")
            
            # Send futures order via python-binance
            response = self.client.futures_create_order(**params)
            
            logger.info(f"Order successfully placed. Binance Response ID: {response.get('orderId')}")
            logger.debug(f"Full Binance response payload: {response}")
            return response

        except BinanceAPIException as e:
            logger.error(f"Binance API Error placing order on {symbol}: {e.message} (Code: {e.code})")
            raise
        except BinanceRequestException as e:
            logger.error(f"Binance Request Error placing order on {symbol}: {e}")
            raise
        except Exception as e:
            logger.critical(f"Failed to execute order due to server/connection error: {e}")
            raise
