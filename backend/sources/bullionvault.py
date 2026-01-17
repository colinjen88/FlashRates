import aiohttp
import xml.etree.ElementTree as ET
from backend.sources.base import BaseSource
from typing import Optional

class BullionVaultSource(BaseSource):
    URL = "https://live.bullionvault.com/secure/api/v2/view_market_xml.do"
    
    def __init__(self):
        super().__init__("BullionVault", priority=1)

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
            async with aiohttp.ClientSession() as session:
                 async with session.get(self.URL, timeout=5) as response:
                    if response.status != 200:
                        return None
                    content = await response.text()
                    
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
            print(f"Error fetching BullionVault: {e}")
            return None
