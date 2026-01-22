import aiohttp
import xml.etree.ElementTree as ET
import logging
from backend.sources.base import BaseSource
from backend.http_client import get_text
from typing import Optional

logger = logging.getLogger(__name__)

class BullionVaultSource(BaseSource):
    URL = "https://live.bullionvault.com/secure/api/v2/view_market_xml.do"
    
    def __init__(self):
        super().__init__("BullionVault", priority=1, supported_symbols={
            "XAU-USD", "XAG-USD",
        })

    async def fetch_price(self, symbol: str) -> Optional[float]:
        # Symbol mapping: XAU-USD -> securityClass="McAgAu" (Actually Au for Gold, Ag for Silver)
        # BullionVault XML uses specific security classes.
        # Au = Gold, Ag = Silver, Pt = Platinum
        
        target_class = None
        if "XAU" in symbol:
            target_class = "McAgAu" # This acts as a catch-all in some XMLs but usually it's securityClass="Au"
        elif "XAG" in symbol:
            target_class = "Ag"
        elif "XPT" in symbol:
            target_class = "Pt"
            
        # Refined mapping based on doc analysis
        # "McAgAu" implies Marketing Class? Let's stick to standard if possible, 
        # but the doc said checks for securityClass="McAgAu" for Gold? 
        # Re-reading doc: "securityClass='McAgAu' (Au代表金)" -> Wait, usually it's specific.
        # Let's try to be robust.
        
        # Standardize symbol to what we expect in logic
        if "XAU" in symbol:
            security_class_substr = "Au"
        elif "XAG" in symbol:
            security_class_substr = "Ag"
        else:
             return None # Not supported

        try:
            status, content = await get_text(
                self.URL,
                timeout=aiohttp.ClientTimeout(total=5),
                retries=2,
                backoff=0.6,
            )
            if status != 200:
                return None
            
            root = ET.fromstring(content)
            # Iterate pitches
            for pitch in root.findall(".//pitch"):
                sec_class = pitch.get("securityClass")
                currency = pitch.get("currency")
                
                if sec_class and security_class_substr in sec_class and currency == "USD":
                    sell_price = pitch.get("sellPrice")
                    if sell_price:
                        return float(sell_price)
            
            return None
        except Exception as e:
            logger.warning(f"Error fetching BullionVault: {e}")
            return None
