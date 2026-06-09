import os
import logging

def setup_logging():
    """Sets up loggers to output both to file and console with proper formats."""
    log_dir = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), 'logs')
    os.makedirs(log_dir, exist_ok=True)
    log_file = os.path.join(log_dir, 'trading.log')

    # Base logging configuration
    logger = logging.getLogger('trading_bot')
    logger.setLevel(logging.DEBUG)

    # Avoid duplicate handlers if setup is called multiple times
    if logger.handlers:
        return logger

    # File handler (logs all debug and above)
    file_formatter = logging.Formatter(
        '%(asctime)s [%(levelname)s] (%(filename)s:%(lineno)d) - %(message)s',
        datefmt='%Y-%m-%d %H:%M:%S'
    )
    file_handler = logging.FileHandler(log_file, encoding='utf-8')
    file_handler.setLevel(logging.DEBUG)
    file_handler.setFormatter(file_formatter)

    # Console handler (logs info and above)
    console_formatter = logging.Formatter(
        '[%(levelname)s] %(message)s'
    )
    console_handler = logging.StreamHandler()
    console_handler.setLevel(logging.INFO)
    console_handler.setFormatter(console_formatter)

    logger.addHandler(file_handler)
    logger.addHandler(console_handler)

    return logger
