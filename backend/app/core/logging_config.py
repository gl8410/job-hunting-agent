import logging
import sys
from app.core.config import settings

def setup_logging():
    """
    Configure logging for the application
    """
    log_level = logging.DEBUG if settings.DEBUG else logging.INFO
    
    # Define a clear format for terminal output
    # %(name)s helps identify which module produced the log
    log_format = "%(asctime)s - %(name)s - %(levelname)s - %(message)s"
    date_format = "%Y-%m-%d %H:%M:%S"

    # Configure the root logger
    logging.basicConfig(
        level=log_level,
        format=log_format,
        datefmt=date_format,
        handlers=[
            logging.StreamHandler(sys.stdout)
        ]
    )

    # Suppress verbose third-party library logs
    # Only show WARNING and above for these libraries
    logging.getLogger("uvicorn.access").setLevel(logging.WARNING)
    logging.getLogger("httpcore").setLevel(logging.WARNING)
    logging.getLogger("httpx").setLevel(logging.WARNING)
    logging.getLogger("hpack").setLevel(logging.WARNING)
    logging.getLogger("httpcore.connection").setLevel(logging.WARNING)
    logging.getLogger("httpcore.http11").setLevel(logging.WARNING)
    logging.getLogger("httpcore.http2").setLevel(logging.WARNING)
    logging.getLogger("httpcore.proxy").setLevel(logging.WARNING)
    
    # Keep application logs at the configured level
    app_logger = logging.getLogger("app")
    app_logger.setLevel(log_level)
    
    # Create an initial log to confirm setup
    logger = logging.getLogger(__name__)
    logger.info(f"Logging initialized in {'DEBUG' if settings.DEBUG else 'INFO'} mode")

def get_logger(name: str):
    """
    Get a logger with the specified name
    """
    return logging.getLogger(name)