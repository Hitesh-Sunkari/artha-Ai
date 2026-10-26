"""ArthaAI Institutional Multi-Asset Universe (74 Candidate Assets).

Contains statistical parameters, historical expected returns (μ), annualized volatility (σ),
historical maximum drawdowns, asset classes, and sector classifications across:
- 50 Indian Equities (Nifty 50 compounders)
- 4 Sovereign & High-Grade Debt instruments
- 4 Fixed Deposits & Cash Equivalents
- 4 Indian REITs & Real Estate
- 4 Commodities & Precious Metals
- 5 Global ETFs
- 3 Digital Reserve Assets
"""

from __future__ import annotations
from typing import Literal
from pydantic import BaseModel, ConfigDict, Field


AssetClass = Literal["equity", "debt", "reit", "commodity", "international", "alternative"]


class UniverseAsset(BaseModel):
    """Statistical profile of an asset in the universal investment pool."""
    model_config = ConfigDict(frozen=True)

    ticker: str
    name: str
    asset_class: AssetClass
    sector: str
    currency: str = "INR"
    expected_return: float = Field(..., description="Annualized expected return μ (e.g. 0.12 for 12%)")
    volatility: float = Field(..., description="Annualized volatility σ (e.g. 0.18 for 18%)")
    max_drawdown: float = Field(..., description="Historical peak-to-trough drawdown (e.g. -0.345)")
    sharpe_baseline: float = Field(..., description="Single-asset baseline Sharpe ratio")
    verified: bool = True
    description: str = ""


# Comprehensive 74-Asset Institutional Universe
UNIVERSE_ASSETS: list[UniverseAsset] = [
    # --- 50 Indian Equities ---
    UniverseAsset(ticker="RELIANCE.NS", name="Reliance Industries", asset_class="equity", sector="Energy", expected_return=0.142, volatility=0.195, max_drawdown=-0.345, sharpe_baseline=0.39, description="Conglomerate spanning Oil-to-Chemicals, Jio telecom, and Reliance Retail."),
    UniverseAsset(ticker="TCS.NS", name="Tata Consultancy Services", asset_class="equity", sector="Technology", expected_return=0.138, volatility=0.165, max_drawdown=-0.268, sharpe_baseline=0.44, description="Global IT services provider with industry-leading ~24% operating margins."),
    UniverseAsset(ticker="HDFCBANK.NS", name="HDFC Bank", asset_class="equity", sector="Financial Services", expected_return=0.145, volatility=0.182, max_drawdown=-0.294, sharpe_baseline=0.44, description="India's largest private bank following historic merger with parent HDFC."),
    UniverseAsset(ticker="INFY.NS", name="Infosys", asset_class="equity", sector="Technology", expected_return=0.135, volatility=0.202, max_drawdown=-0.320, sharpe_baseline=0.35, description="Premier digital consulting, cloud enterprise transformation, and AI software."),
    UniverseAsset(ticker="ICICIBANK.NS", name="ICICI Bank", asset_class="equity", sector="Financial Services", expected_return=0.158, volatility=0.205, max_drawdown=-0.312, sharpe_baseline=0.45, description="High-compounding retail franchise with pristine asset quality (NNPA < 0.5%)."),
    UniverseAsset(ticker="HINDUNILVR.NS", name="Hindustan Unilever", asset_class="equity", sector="Consumer Defensive", expected_return=0.112, volatility=0.148, max_drawdown=-0.210, sharpe_baseline=0.32, description="India's dominant FMCG titan with 9 out of 10 Indian households as daily consumers."),
    UniverseAsset(ticker="ITC.NS", name="ITC Ltd", asset_class="equity", sector="Consumer Defensive", expected_return=0.128, volatility=0.162, max_drawdown=-0.245, sharpe_baseline=0.39, description="Cash cow cigarette monopoly diversifying into branded foods, hotels, and paper."),
    UniverseAsset(ticker="SBIN.NS", name="State Bank of India", asset_class="equity", sector="Financial Services", expected_return=0.152, volatility=0.245, max_drawdown=-0.410, sharpe_baseline=0.36, description="State-owned banking backbone managing over ₹60 lakh crore in balance sheet assets."),
    UniverseAsset(ticker="BHARTIARTL.NS", name="Bharti Airtel", asset_class="equity", sector="Communication Services", expected_return=0.165, volatility=0.210, max_drawdown=-0.285, sharpe_baseline=0.48, description="Telecom duopoly leader with growing ARPU, Africa operations, and enterprise data."),
    UniverseAsset(ticker="LICI.NS", name="Life Insurance Corp of India", asset_class="equity", sector="Financial Services", expected_return=0.118, volatility=0.188, max_drawdown=-0.360, sharpe_baseline=0.28, description="Largest domestic institutional investor and life insurer in India."),
    UniverseAsset(ticker="KOTAKBANK.NS", name="Kotak Mahindra Bank", asset_class="equity", sector="Financial Services", expected_return=0.134, volatility=0.178, max_drawdown=-0.280, sharpe_baseline=0.39, description="High-CASA private bank known for conservative underwriting."),
    UniverseAsset(ticker="LT.NS", name="Larsen & Toubro", asset_class="equity", sector="Industrials", expected_return=0.162, volatility=0.215, max_drawdown=-0.330, sharpe_baseline=0.45, description="Infrastructure, defense manufacturing, and EPC bellwether with huge record order books."),
    UniverseAsset(ticker="AXISBANK.NS", name="Axis Bank", asset_class="equity", sector="Financial Services", expected_return=0.148, volatility=0.235, max_drawdown=-0.385, sharpe_baseline=0.35, description="Full-service retail & corporate bank with Citibank consumer acquisition integration."),
    UniverseAsset(ticker="HCLTECH.NS", name="HCL Technologies", asset_class="equity", sector="Technology", expected_return=0.140, volatility=0.185, max_drawdown=-0.275, sharpe_baseline=0.41, description="Engineering R&D and digital infrastructure services compounding stably."),
    UniverseAsset(ticker="BAJFINANCE.NS", name="Bajaj Finance", asset_class="equity", sector="Financial Services", expected_return=0.182, volatility=0.265, max_drawdown=-0.420, sharpe_baseline=0.44, description="India's leading consumer tech NBFC with omni-channel customer cross-selling."),
    UniverseAsset(ticker="MARUTI.NS", name="Maruti Suzuki", asset_class="equity", sector="Consumer Cyclical", expected_return=0.135, volatility=0.205, max_drawdown=-0.340, sharpe_baseline=0.34, description="Dominant passenger vehicle manufacturer expanding rapidly into hybrid SUVs."),
    UniverseAsset(ticker="SUNPHARMA.NS", name="Sun Pharma", asset_class="equity", sector="Healthcare", expected_return=0.144, volatility=0.175, max_drawdown=-0.260, sharpe_baseline=0.45, description="India's largest pharmaceutical manufacturer with growing global specialty pipelines."),
    UniverseAsset(ticker="TITAN.NS", name="Titan Company", asset_class="equity", sector="Consumer Cyclical", expected_return=0.175, volatility=0.228, max_drawdown=-0.315, sharpe_baseline=0.48, description="Tata group luxury lifestyle franchise dominating organized jewelry (Tanishq)."),
    UniverseAsset(ticker="ULTRACEMCO.NS", name="UltraTech Cement", asset_class="equity", sector="Basic Materials", expected_return=0.139, volatility=0.198, max_drawdown=-0.290, sharpe_baseline=0.37, description="Aditya Birla flagship and India's largest cement producer."),
    UniverseAsset(ticker="ASIANPAINT.NS", name="Asian Paints", asset_class="equity", sector="Consumer Cyclical", expected_return=0.125, volatility=0.192, max_drawdown=-0.295, sharpe_baseline=0.31, description="Decorative paints market leader with unmatched dealer network supply moats."),
    UniverseAsset(ticker="TATAMOTORS.NS", name="Tata Motors", asset_class="equity", sector="Consumer Cyclical", expected_return=0.172, volatility=0.285, max_drawdown=-0.460, sharpe_baseline=0.38, description="Domestic EV pioneer and owner of luxury British brand Jaguar Land Rover."),
    UniverseAsset(ticker="NTPC.NS", name="NTPC Ltd", asset_class="equity", sector="Utilities", expected_return=0.148, volatility=0.195, max_drawdown=-0.280, sharpe_baseline=0.43, description="India's largest power utility pivoting aggressively into green renewable energy."),
    UniverseAsset(ticker="ONGC.NS", name="Oil & Natural Gas Corp", asset_class="equity", sector="Energy", expected_return=0.130, volatility=0.250, max_drawdown=-0.440, sharpe_baseline=0.26, description="State exploration and production company benefiting from domestic gas pricing."),
    UniverseAsset(ticker="POWERGRID.NS", name="Power Grid Corp", asset_class="equity", sector="Utilities", expected_return=0.132, volatility=0.165, max_drawdown=-0.220, sharpe_baseline=0.41, description="Regulated returns monopoly transmitting 85%+ of India's inter-state electrical power."),
    UniverseAsset(ticker="TATASTEEL.NS", name="Tata Steel", asset_class="equity", sector="Basic Materials", expected_return=0.145, volatility=0.290, max_drawdown=-0.480, sharpe_baseline=0.28, description="Low-cost Indian blast-furnace producer transitioning UK plants to electric arc."),
    UniverseAsset(ticker="M&M.NS", name="Mahindra & Mahindra", asset_class="equity", sector="Consumer Cyclical", expected_return=0.168, volatility=0.240, max_drawdown=-0.360, sharpe_baseline=0.43, description="Market leader in farm tractors and high-demand premium lifestyle SUVs."),
    UniverseAsset(ticker="COALINDIA.NS", name="Coal India", asset_class="equity", sector="Energy", expected_return=0.135, volatility=0.220, max_drawdown=-0.380, sharpe_baseline=0.32, description="World's largest coal miner supplying 75%+ of India's thermal power stations."),
    UniverseAsset(ticker="BAJAJFINSV.NS", name="Bajaj Finserv", asset_class="equity", sector="Financial Services", expected_return=0.160, volatility=0.255, max_drawdown=-0.400, sharpe_baseline=0.37, description="Holding company for Bajaj Finance, Bajaj Allianz Life, and General Insurance."),
    UniverseAsset(ticker="ADANIENT.NS", name="Adani Enterprises", asset_class="equity", sector="Industrials", expected_return=0.180, volatility=0.365, max_drawdown=-0.620, sharpe_baseline=0.32, description="Incubator company for airports, roads, data centers, and green hydrogen."),
    UniverseAsset(ticker="ADANIPORTS.NS", name="Adani Ports & SEZ", asset_class="equity", sector="Industrials", expected_return=0.155, volatility=0.250, max_drawdown=-0.390, sharpe_baseline=0.36, description="India's largest private commercial port operator with 25%+ national cargo share."),
    UniverseAsset(ticker="JSWSTEEL.NS", name="JSW Steel", asset_class="equity", sector="Basic Materials", expected_return=0.142, volatility=0.275, max_drawdown=-0.450, sharpe_baseline=0.28, description="Sajjan Jindal flagship operating ultra-modern efficient steel production complexes."),
    UniverseAsset(ticker="HINDALCO.NS", name="Hindalco Industries", asset_class="equity", sector="Basic Materials", expected_return=0.150, volatility=0.285, max_drawdown=-0.440, sharpe_baseline=0.30, description="Aluminium and copper giant owning US-based rolling producer Novelis."),
    UniverseAsset(ticker="GRASIM.NS", name="Grasim Industries", asset_class="equity", sector="Basic Materials", expected_return=0.138, volatility=0.220, max_drawdown=-0.320, sharpe_baseline=0.33, description="VSF market leader expanding with Birla Opus paints disruption."),
    UniverseAsset(ticker="TECHM.NS", name="Tech Mahindra", asset_class="equity", sector="Technology", expected_return=0.128, volatility=0.225, max_drawdown=-0.370, sharpe_baseline=0.28, description="IT services leader specializing in 5G telecoms and enterprise transformation."),
    UniverseAsset(ticker="WIPRO.NS", name="Wipro", asset_class="equity", sector="Technology", expected_return=0.120, volatility=0.210, max_drawdown=-0.350, sharpe_baseline=0.26, description="Global technology, consulting, and cloud business process enterprise."),
    UniverseAsset(ticker="CIPLA.NS", name="Cipla", asset_class="equity", sector="Healthcare", expected_return=0.140, volatility=0.170, max_drawdown=-0.240, sharpe_baseline=0.44, description="Respiratory and chronic medicine powerhouse in India and emerging markets."),
    UniverseAsset(ticker="NESTLEIND.NS", name="Nestle India", asset_class="equity", sector="Consumer Defensive", expected_return=0.130, volatility=0.155, max_drawdown=-0.220, sharpe_baseline=0.42, description="Packaged food franchise behind Maggi, Nescafe, KitKat, and infant nutrition."),
    UniverseAsset(ticker="DRREDDY.NS", name="Dr Reddy's Laboratories", asset_class="equity", sector="Healthcare", expected_return=0.136, volatility=0.190, max_drawdown=-0.280, sharpe_baseline=0.37, description="Generics, active pharmaceutical ingredients (APIs), and biosimilars manufacturer."),
    UniverseAsset(ticker="SBILIFE.NS", name="SBI Life Insurance", asset_class="equity", sector="Financial Services", expected_return=0.142, volatility=0.185, max_drawdown=-0.270, sharpe_baseline=0.42, description="Bancassurance engine leveraging SBI's 22,000+ branch distribution reach."),
    UniverseAsset(ticker="BPCL.NS", name="Bharat Petroleum", asset_class="equity", sector="Energy", expected_return=0.132, volatility=0.245, max_drawdown=-0.410, sharpe_baseline=0.27, description="Downstream fuel marketing and refining PSU with high dividend payouts."),
    UniverseAsset(ticker="BRITANNIA.NS", name="Britannia Industries", asset_class="equity", sector="Consumer Defensive", expected_return=0.132, volatility=0.165, max_drawdown=-0.230, sharpe_baseline=0.41, description="Bakery and biscuit brand leader with 33%+ Indian market share."),
    UniverseAsset(ticker="TATACONSUM.NS", name="Tata Consumer Products", asset_class="equity", sector="Consumer Defensive", expected_return=0.145, volatility=0.195, max_drawdown=-0.285, sharpe_baseline=0.41, description="Tata Tea, Tata Salt, Sampann pulses, and Starbucks India JV operator."),
    UniverseAsset(ticker="EICHERMOT.NS", name="Eicher Motors", asset_class="equity", sector="Consumer Cyclical", expected_return=0.155, volatility=0.220, max_drawdown=-0.340, sharpe_baseline=0.41, description="High-margin middleweight motorcycle monopoly (Royal Enfield)."),
    UniverseAsset(ticker="APOLLOHOSP.NS", name="Apollo Hospitals", asset_class="equity", sector="Healthcare", expected_return=0.162, volatility=0.215, max_drawdown=-0.310, sharpe_baseline=0.45, description="Integrated private healthcare chain with hospitals, 24/7 pharmacies, and tele-health."),
    UniverseAsset(ticker="DIVISLAB.NS", name="Divi's Laboratories", asset_class="equity", sector="Healthcare", expected_return=0.146, volatility=0.230, max_drawdown=-0.360, sharpe_baseline=0.35, description="Custom synthesis and high-margin API partner to global big pharma."),
    UniverseAsset(ticker="HEROMOTOCO.NS", name="Hero MotoCorp", asset_class="equity", sector="Consumer Cyclical", expected_return=0.126, volatility=0.205, max_drawdown=-0.320, sharpe_baseline=0.30, description="World's largest two-wheeler manufacturer by volume with rural dominance."),
    UniverseAsset(ticker="SHREECEM.NS", name="Shree Cement", asset_class="equity", sector="Basic Materials", expected_return=0.130, volatility=0.210, max_drawdown=-0.330, sharpe_baseline=0.31, description="Efficient cement producer in northern and eastern Indian markets."),
    UniverseAsset(ticker="BAJAJ-AUTO.NS", name="Bajaj Auto", asset_class="equity", sector="Consumer Cyclical", expected_return=0.158, volatility=0.200, max_drawdown=-0.270, sharpe_baseline=0.47, description="Pulsar motorbikes, commercial 3-wheelers, and high-growth EV scooter exports."),
    UniverseAsset(ticker="INDUSINDBK.NS", name="IndusInd Bank", asset_class="equity", sector="Financial Services", expected_return=0.142, volatility=0.280, max_drawdown=-0.510, sharpe_baseline=0.28, description="Private lender specializing in commercial vehicle and microfinance loans."),
    UniverseAsset(ticker="UPL.NS", name="UPL Ltd", asset_class="equity", sector="Basic Materials", expected_return=0.115, volatility=0.310, max_drawdown=-0.580, sharpe_baseline=0.16, description="Global crop protection chemical solutions and biosolutions provider."),

    # --- 4 Sovereign & High-Grade Debt ---
    UniverseAsset(ticker="INDIA_GOVT_10Y", name="Govt of India 10Y Sovereign Bond (7.15%)", asset_class="debt", sector="Sovereign Debt", expected_return=0.0715, volatility=0.042, max_drawdown=-0.045, sharpe_baseline=0.15, description="Zero default-risk sovereign benchmark paper backed by the Reserve Bank of India."),
    UniverseAsset(ticker="TREASURY_BILL_91D", name="RBI 91-Day Treasury Bill (6.7%)", asset_class="debt", sector="Sovereign Short-Term", expected_return=0.0670, volatility=0.015, max_drawdown=-0.005, sharpe_baseline=0.13, description="Ultra-short sovereign money market paper with near-zero duration risk."),
    UniverseAsset(ticker="INDIA_CORP_AAA", name="CRISIL AAA Corporate Bond Index (7.9%)", asset_class="debt", sector="Corporate Debt", expected_return=0.0790, volatility=0.052, max_drawdown=-0.062, sharpe_baseline=0.27, description="Top-tier institutional corporate debt index (HDFC, REC, NABARD, PowerGrid)."),
    UniverseAsset(ticker="US_TREASURY_10Y", name="US 10-Year Treasury Benchmark (4.3%)", asset_class="debt", sector="Global Sovereign Debt", currency="USD", expected_return=0.0780, volatility=0.085, max_drawdown=-0.145, sharpe_baseline=0.15, description="Global risk-free anchor including historical USD/INR 3-4% currency depreciation tailwind."),

    # --- 4 Fixed Deposits & Cash Equivalents ---
    UniverseAsset(ticker="SBI_FD", name="SBI 1-Yr Fixed Deposit (6.8%)", asset_class="debt", sector="Fixed Income / Cash", expected_return=0.0680, volatility=0.012, max_drawdown=-0.002, sharpe_baseline=0.25, description="Term deposit backed by State Bank of India with DICGC insurance protection."),
    UniverseAsset(ticker="HDFC_FD", name="HDFC Bank 1-Yr Fixed Deposit (7.1%)", asset_class="debt", sector="Fixed Income / Cash", expected_return=0.0710, volatility=0.012, max_drawdown=-0.002, sharpe_baseline=0.50, description="Highest-rated private banking term deposit compounding quarterly."),
    UniverseAsset(ticker="SAVINGS_ACCOUNT", name="High-Yield Liquid Savings (4.0%)", asset_class="debt", sector="Cash & Equivalents", expected_return=0.0400, volatility=0.005, max_drawdown=0.000, sharpe_baseline=-5.00, description="Immediate liquid cash buffer for emergency outlays."),
    UniverseAsset(ticker="BND", name="Vanguard Total Bond Market ETF", asset_class="debt", sector="Global Fixed Income", currency="USD", expected_return=0.0720, volatility=0.065, max_drawdown=-0.120, sharpe_baseline=0.11, description="Broad institutional investment-grade US bond market ETF."),

    # --- 4 REITs & Real Estate ---
    UniverseAsset(ticker="EMBASSY_REIT", name="Embassy Office Parks REIT", asset_class="reit", sector="Real Estate", expected_return=0.115, volatility=0.145, max_drawdown=-0.220, sharpe_baseline=0.34, description="India's first publicly listed REIT managing Grade-A institutional office tech parks."),
    UniverseAsset(ticker="MINDSPACE_REIT", name="Mindspace Business Parks REIT", asset_class="reit", sector="Real Estate", expected_return=0.112, volatility=0.140, max_drawdown=-0.210, sharpe_baseline=0.34, description="K Raheja Corp portfolio in Mumbai, Hyderabad, Pune, and Chennai."),
    UniverseAsset(ticker="BROOKFIELD_REIT", name="Brookfield India Real Estate Trust", asset_class="reit", sector="Real Estate", expected_return=0.118, volatility=0.155, max_drawdown=-0.240, sharpe_baseline=0.34, description="100% institutionally managed campus-format office developments."),
    UniverseAsset(ticker="VNQ", name="Vanguard Real Estate US ETF", asset_class="reit", sector="Global Real Estate", currency="USD", expected_return=0.108, volatility=0.185, max_drawdown=-0.310, sharpe_baseline=0.23, description="US commercial real estate equity investment trusts across logistics & towers."),

    # --- 4 Commodities & Precious Metals ---
    UniverseAsset(ticker="GOLDBEES.NS", name="Nippon India Gold ETF BeES", asset_class="commodity", sector="Precious Metals", expected_return=0.105, volatility=0.138, max_drawdown=-0.185, sharpe_baseline=0.29, description="Physical 99.5% pure gold bullion ETF; prime non-correlated crisis buffer."),
    UniverseAsset(ticker="SILVERBEES.NS", name="Nippon India Silver ETF BeES", asset_class="commodity", sector="Precious Metals", expected_return=0.115, volatility=0.225, max_drawdown=-0.320, sharpe_baseline=0.22, description="Physical silver tracking industrial electrification and monetary demand."),
    UniverseAsset(ticker="CRUDE_OIL", name="WTI / MCX Crude Oil Benchmark", asset_class="commodity", sector="Energy Commodities", currency="USD", expected_return=0.085, volatility=0.340, max_drawdown=-0.650, sharpe_baseline=0.06, description="Global petroleum benchmark highly sensitive to OPEC+ supply quotas."),
    UniverseAsset(ticker="COPPER", name="Global Copper & Industrial Metals Fund", asset_class="commodity", sector="Industrial Metals", currency="USD", expected_return=0.098, volatility=0.245, max_drawdown=-0.380, sharpe_baseline=0.13, description="Electrification, renewable grid, and industrial manufacturing bellwether."),

    # --- 5 Global ETFs ---
    UniverseAsset(ticker="SPY", name="SPDR S&P 500 ETF Trust", asset_class="international", sector="US Broad Market", currency="USD", expected_return=0.138, volatility=0.165, max_drawdown=-0.240, sharpe_baseline=0.44, description="Top 500 American corporations weighted by market capitalization (in INR terms)."),
    UniverseAsset(ticker="QQQ", name="Invesco QQQ Trust Nasdaq 100", asset_class="international", sector="US Technology", currency="USD", expected_return=0.162, volatility=0.215, max_drawdown=-0.325, sharpe_baseline=0.45, description="Apple, Microsoft, Nvidia, Amazon, Alphabet, Meta, Broadcom compounding alpha."),
    UniverseAsset(ticker="VTI", name="Vanguard Total Stock Market ETF", asset_class="international", sector="US Broad Market", currency="USD", expected_return=0.135, volatility=0.170, max_drawdown=-0.250, sharpe_baseline=0.41, description="Complete US market including small, mid, and large cap public equities."),
    UniverseAsset(ticker="VT", name="Vanguard Total World Stock ETF", asset_class="international", sector="Global Broad Market", currency="USD", expected_return=0.122, volatility=0.160, max_drawdown=-0.245, sharpe_baseline=0.36, description="Over 9,800 stocks across developed and emerging market exchanges."),
    UniverseAsset(ticker="EEM", name="iShares MSCI Emerging Markets ETF", asset_class="international", sector="Emerging Markets", currency="USD", expected_return=0.105, volatility=0.195, max_drawdown=-0.340, sharpe_baseline=0.21, description="Exposure to fast-growing economies (Taiwan, Korea, India, Brazil, Mexico)."),

    # --- 3 Digital Reserve Assets ---
    UniverseAsset(ticker="BTC-USD", name="Bitcoin (Digital Gold)", asset_class="alternative", sector="Cryptocurrency", currency="USD", expected_return=0.220, volatility=0.580, max_drawdown=-0.750, sharpe_baseline=0.27, description="Decentralized scarce store-of-value network with programmatic halving supply."),
    UniverseAsset(ticker="ETH-USD", name="Ethereum (Smart Contract Protocol)", asset_class="alternative", sector="Cryptocurrency", currency="USD", expected_return=0.240, volatility=0.680, max_drawdown=-0.800, sharpe_baseline=0.26, description="Decentralized proof-of-stake settlement layer powering smart contracts & DeFi."),
    UniverseAsset(ticker="SOL-USD", name="Solana (Decentralized Finance)", asset_class="alternative", sector="Cryptocurrency", currency="USD", expected_return=0.260, volatility=0.820, max_drawdown=-0.880, sharpe_baseline=0.24, description="Ultra-high throughput blockchain infrastructure handling 3,000+ TPS."),
]

# Lookup map by ticker
UNIVERSE_BY_TICKER: dict[str, UniverseAsset] = {a.ticker: a for a in UNIVERSE_ASSETS}

# Institutional Presets for 1-Click Universe Selection
PRESET_UNIVERSES: dict[str, list[str]] = {
    "Balanced 60/40": [
        "RELIANCE.NS", "TCS.NS", "HDFCBANK.NS", "INFY.NS", "ICICIBANK.NS", "LT.NS",
        "INDIA_GOVT_10Y", "SBI_FD", "INDIA_CORP_AAA", "GOLDBEES.NS",
    ],
    "All-Weather (Bonds + Gold + REITs)": [
        "RELIANCE.NS", "HDFCBANK.NS", "TCS.NS", "INDIA_GOVT_10Y", "TREASURY_BILL_91D",
        "SBI_FD", "EMBASSY_REIT", "MINDSPACE_REIT", "GOLDBEES.NS", "SPY",
    ],
    "Top 20 Nifty 50": [
        "RELIANCE.NS", "TCS.NS", "HDFCBANK.NS", "INFY.NS", "ICICIBANK.NS", "HINDUNILVR.NS",
        "ITC.NS", "SBIN.NS", "BHARTIARTL.NS", "KOTAKBANK.NS", "LT.NS", "AXISBANK.NS",
        "BAJFINANCE.NS", "MARUTI.NS", "SUNPHARMA.NS", "TITAN.NS", "TATAMOTORS.NS", "NTPC.NS",
        "POWERGRID.NS", "M&M.NS",
    ],
    "Tech & Growth Alpha": [
        "TCS.NS", "INFY.NS", "HCLTECH.NS", "TECHM.NS", "QQQ", "TITAN.NS", "BAJFINANCE.NS",
        "BTC-USD", "EMBASSY_REIT", "GOLDBEES.NS",
    ],
}


def get_universe(category: str | None = None, search: str | None = None) -> list[UniverseAsset]:
    """Filters universe assets by asset_class and text search."""
    results = UNIVERSE_ASSETS
    if category and category != "all":
        results = [a for a in results if a.asset_class == category]
    if search:
        s = search.lower().strip()
        results = [
            a for a in results
            if s in a.ticker.lower() or s in a.name.lower() or s in a.sector.lower()
        ]
    return results
