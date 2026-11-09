"""ArthaAI Institutional Multi-Asset Universe (112 Candidate Assets).

Contains statistical parameters, historical expected returns (μ), annualized volatility (σ),
historical maximum drawdowns, asset classes, and sector classifications across:
- 88 Indian Equities (Nifty 50 compounders, Quick Commerce, Defense, Railways, Green Energy, Retail, EMS, Midcap IT, High-Yield PSUs)
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
    latest_close: float | None = None
    data_source: str = "PARAMETRIC"


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

    # --- New-Age Tech, Quick Commerce & Market Infrastructure ---
    UniverseAsset(ticker="SWIGGY.NS", name="Swiggy Limited", asset_class="equity", sector="Consumer Cyclical", expected_return=0.175, volatility=0.290, max_drawdown=-0.380, sharpe_baseline=0.38, description="Hyperlocal food delivery and Instamart quick commerce platform with pan-India dark store density."),
    UniverseAsset(ticker="ZOMATO.NS", name="Zomato Limited", asset_class="equity", sector="Consumer Cyclical", expected_return=0.185, volatility=0.295, max_drawdown=-0.410, sharpe_baseline=0.41, description="Dominant quick commerce (Blinkit) and dining discovery ecosystem turning GAAP profitable."),
    UniverseAsset(ticker="PAYTM.NS", name="One97 Communications (Paytm)", asset_class="equity", sector="Financial Services", expected_return=0.155, volatility=0.340, max_drawdown=-0.520, sharpe_baseline=0.26, description="Pioneer of QR payments, Soundbox devices, and merchant credit distribution."),
    UniverseAsset(ticker="NYKAA.NS", name="FSN E-Commerce (Nykaa)", asset_class="equity", sector="Consumer Cyclical", expected_return=0.160, volatility=0.285, max_drawdown=-0.390, sharpe_baseline=0.33, description="Specialized omnichannel beauty, wellness, and fashion retailer with high customer loyalty."),
    UniverseAsset(ticker="POLICYBZR.NS", name="PB Fintech (PolicyBazaar)", asset_class="equity", sector="Financial Services", expected_return=0.168, volatility=0.280, max_drawdown=-0.360, sharpe_baseline=0.37, description="India's largest online insurance marketplace and Paisabazaar digital lending platform."),
    UniverseAsset(ticker="BSE.NS", name="BSE Limited", asset_class="equity", sector="Financial Services", expected_return=0.190, volatility=0.310, max_drawdown=-0.420, sharpe_baseline=0.40, description="Asia's oldest stock exchange scaling index derivatives market share and StAR MF platform."),
    UniverseAsset(ticker="CDSL.NS", name="Central Depository Services", asset_class="equity", sector="Financial Services", expected_return=0.178, volatility=0.250, max_drawdown=-0.330, sharpe_baseline=0.45, description="First listed Indian depository crossing 11+ crore registered demat investment accounts."),

    # --- Defense, Aerospace & Munitions (Make in India) ---
    UniverseAsset(ticker="HAL.NS", name="Hindustan Aeronautics", asset_class="equity", sector="Industrials", expected_return=0.195, volatility=0.265, max_drawdown=-0.340, sharpe_baseline=0.49, description="Monopoly supplier of fighter jets (Tejas), attack helicopters (Prachand), and aerospace engines."),
    UniverseAsset(ticker="BEL.NS", name="Bharat Electronics", asset_class="equity", sector="Industrials", expected_return=0.188, volatility=0.245, max_drawdown=-0.310, sharpe_baseline=0.50, description="Navratna defense electronics powerhouse dominating radars, missile guidance, and EVMs."),
    UniverseAsset(ticker="MAZDOCK.NS", name="Mazagon Dock Shipbuilders", asset_class="equity", sector="Industrials", expected_return=0.205, volatility=0.330, max_drawdown=-0.440, sharpe_baseline=0.42, description="Premier defense shipyard constructing Kalvari-class stealth submarines and destroyers."),
    UniverseAsset(ticker="SOLARINDS.NS", name="Solar Industries India", asset_class="equity", sector="Basic Materials", expected_return=0.185, volatility=0.240, max_drawdown=-0.290, sharpe_baseline=0.50, description="Global industrial explosives leader supplying military propellants, warheads, and loitering munitions."),
    UniverseAsset(ticker="COCHINSHIP.NS", name="Cochin Shipyard", asset_class="equity", sector="Industrials", expected_return=0.192, volatility=0.350, max_drawdown=-0.460, sharpe_baseline=0.36, description="Builder of India's first indigenous aircraft carrier (INS Vikrant) and green electric vessels."),

    # --- Railways & Transit Infrastructure ---
    UniverseAsset(ticker="IRFC.NS", name="Indian Railway Finance Corp", asset_class="equity", sector="Financial Services", expected_return=0.165, volatility=0.260, max_drawdown=-0.350, sharpe_baseline=0.38, description="Dedicated market borrowing arm for Indian Railways with pristine zero non-performing assets."),
    UniverseAsset(ticker="RVNL.NS", name="Rail Vikas Nigam Limited", asset_class="equity", sector="Industrials", expected_return=0.180, volatility=0.340, max_drawdown=-0.460, sharpe_baseline=0.34, description="Rail infrastructure turnkey project executor spanning track doubling, electrification, and metro lines."),
    UniverseAsset(ticker="IRCON.NS", name="Ircon International", asset_class="equity", sector="Industrials", expected_return=0.160, volatility=0.310, max_drawdown=-0.420, sharpe_baseline=0.31, description="Specialized railway and highway construction PSU executing complex tunnel and bridge projects."),
    UniverseAsset(ticker="TITAGARH.NS", name="Titagarh Rail Systems", asset_class="equity", sector="Industrials", expected_return=0.182, volatility=0.325, max_drawdown=-0.430, sharpe_baseline=0.36, description="Manufacturer of freight wagons, Vande Bharat trainsets, and metro passenger transit cars."),

    # --- Green Energy, Utilities & Power Transition ---
    UniverseAsset(ticker="TATAPOWER.NS", name="Tata Power Company", asset_class="equity", sector="Utilities", expected_return=0.170, volatility=0.250, max_drawdown=-0.350, sharpe_baseline=0.42, description="Integrated clean energy player spanning rooftop solar, microgrids, EV fast charging, and hydro."),
    UniverseAsset(ticker="SUZLON.NS", name="Suzlon Energy", asset_class="equity", sector="Industrials", expected_return=0.198, volatility=0.380, max_drawdown=-0.540, sharpe_baseline=0.35, description="Turnaround wind turbine OEM and renewable energy EPC with massive order book expansion."),
    UniverseAsset(ticker="ADANIGREEN.NS", name="Adani Green Energy", asset_class="equity", sector="Utilities", expected_return=0.175, volatility=0.360, max_drawdown=-0.560, sharpe_baseline=0.31, description="Developer of the world's largest renewable energy hybrid park at Khavda, Gujarat."),
    UniverseAsset(ticker="JSWENERGY.NS", name="JSW Energy", asset_class="equity", sector="Utilities", expected_return=0.168, volatility=0.275, max_drawdown=-0.380, sharpe_baseline=0.37, description="Power producer rapidly expanding hydro pumped storage and solar generation pipelines."),
    UniverseAsset(ticker="IREDA.NS", name="Indian Renewable Energy Dev Agency", asset_class="equity", sector="Financial Services", expected_return=0.175, volatility=0.320, max_drawdown=-0.440, sharpe_baseline=0.34, description="Pure-play green financing NBFC funding solar, wind, green hydrogen, and bio-energy projects."),

    # --- Retail, Fast Consumer Growth & EMS ---
    UniverseAsset(ticker="TRENT.NS", name="Trent Limited", asset_class="equity", sector="Consumer Cyclical", expected_return=0.210, volatility=0.260, max_drawdown=-0.290, sharpe_baseline=0.56, description="Tata value-fashion retail juggernaut powering Zudio and Westside hyper-growth store rollouts."),
    UniverseAsset(ticker="DIXON.NS", name="Dixon Technologies", asset_class="equity", sector="Technology", expected_return=0.195, volatility=0.275, max_drawdown=-0.350, sharpe_baseline=0.47, description="India's flagship EMS leader assembling smartphones, LED TVs, appliances, and telecom equipment."),
    UniverseAsset(ticker="POLYCAB.NS", name="Polycab India", asset_class="equity", sector="Industrials", expected_return=0.178, volatility=0.235, max_drawdown=-0.295, sharpe_baseline=0.48, description="Market leader in institutional wires, high-voltage cables, and fast-moving electrical goods."),
    UniverseAsset(ticker="HAVELLS.NS", name="Havells India", asset_class="equity", sector="Consumer Cyclical", expected_return=0.155, volatility=0.210, max_drawdown=-0.280, sharpe_baseline=0.43, description="Electrical consumer goods powerhouse behind Crabtree switchgear, Havells, and Lloyd ACs."),

    # --- Capital Goods, Heavy Engineering & Automation ---
    UniverseAsset(ticker="SIEMENS.NS", name="Siemens India", asset_class="equity", sector="Industrials", expected_return=0.175, volatility=0.225, max_drawdown=-0.270, sharpe_baseline=0.49, description="Smart grid, digital enterprise automation, and railway propulsion technology partner."),
    UniverseAsset(ticker="ABB.NS", name="ABB India", asset_class="equity", sector="Industrials", expected_return=0.180, volatility=0.240, max_drawdown=-0.285, sharpe_baseline=0.48, description="Pioneer in industrial robotics, electrification products, motion drives, and smart factories."),
    UniverseAsset(ticker="CUMMINSIND.NS", name="Cummins India", asset_class="equity", sector="Industrials", expected_return=0.168, volatility=0.220, max_drawdown=-0.270, sharpe_baseline=0.47, description="Diesel and alternative fuel internal combustion engines and backup power gensets for data centers."),

    # --- Midcap Technology, AI & Engineering R&D ---
    UniverseAsset(ticker="PERSISTENT.NS", name="Persistent Systems", asset_class="equity", sector="Technology", expected_return=0.185, volatility=0.235, max_drawdown=-0.290, sharpe_baseline=0.51, description="High-margin enterprise software product engineering, cloud modernization, and GenAI services."),
    UniverseAsset(ticker="KPITTECH.NS", name="KPIT Technologies", asset_class="equity", sector="Technology", expected_return=0.190, volatility=0.260, max_drawdown=-0.330, sharpe_baseline=0.48, description="Pure-play automotive embedded software partner to global EV and autonomous vehicle OEMs."),
    UniverseAsset(ticker="COFORGE.NS", name="Coforge Limited", asset_class="equity", sector="Technology", expected_return=0.172, volatility=0.245, max_drawdown=-0.320, sharpe_baseline=0.44, description="Digital IT solutions specialist with deep domain leadership in travel, banking, and insurance."),
    UniverseAsset(ticker="LTTS.NS", name="L&T Technology Services", asset_class="equity", sector="Technology", expected_return=0.160, volatility=0.230, max_drawdown=-0.300, sharpe_baseline=0.41, description="Engineering research and development (ER&D) services for medical, industrial, and telecom clients."),

    # --- High-Dividend PSU Champions & Natural Resources ---
    UniverseAsset(ticker="PFC.NS", name="Power Finance Corp", asset_class="equity", sector="Financial Services", expected_return=0.165, volatility=0.255, max_drawdown=-0.380, sharpe_baseline=0.39, description="Maharatna power and infrastructure lending PSU with high dividend yield payouts."),
    UniverseAsset(ticker="RECLTD.NS", name="REC Limited", asset_class="equity", sector="Financial Services", expected_return=0.168, volatility=0.265, max_drawdown=-0.390, sharpe_baseline=0.39, description="Infrastructure finance company financing renewable power, transmission, and smart metering."),
    UniverseAsset(ticker="GAIL.NS", name="GAIL (India) Limited", asset_class="equity", sector="Utilities", expected_return=0.150, volatility=0.225, max_drawdown=-0.340, sharpe_baseline=0.38, description="Natural gas transmission pipeline monopoly handling 70%+ of India's gas grid volume."),
    UniverseAsset(ticker="IOC.NS", name="Indian Oil Corp", asset_class="equity", sector="Energy", expected_return=0.145, volatility=0.235, max_drawdown=-0.370, sharpe_baseline=0.34, description="India's largest oil refiner and petroleum fuels retail distribution franchise."),
    UniverseAsset(ticker="VEDL.NS", name="Vedanta Limited", asset_class="equity", sector="Basic Materials", expected_return=0.165, volatility=0.310, max_drawdown=-0.480, sharpe_baseline=0.32, description="Diversified natural resources giant across zinc (HZL), aluminum, oil & gas, and copper."),

    # --- Specialty Healthcare, Formulations & Agrochemicals ---
    UniverseAsset(ticker="MANKIND.NS", name="Mankind Pharma", asset_class="equity", sector="Healthcare", expected_return=0.168, volatility=0.210, max_drawdown=-0.250, sharpe_baseline=0.49, description="Domestic formulations powerhouse behind Manforce, PregaNews, and chronic therapies."),
    UniverseAsset(ticker="TORNTPHARM.NS", name="Torrent Pharmaceuticals", asset_class="equity", sector="Healthcare", expected_return=0.162, volatility=0.185, max_drawdown=-0.230, sharpe_baseline=0.52, description="Top-tier cardiovascular and CNS domestic prescription portfolio with Curatio integration."),
    UniverseAsset(ticker="LUPIN.NS", name="Lupin Limited", asset_class="equity", sector="Healthcare", expected_return=0.158, volatility=0.230, max_drawdown=-0.320, sharpe_baseline=0.40, description="Global respiratory and complex generics manufacturer with FDA approval tailwinds."),
    UniverseAsset(ticker="PIIND.NS", name="PI Industries", asset_class="equity", sector="Basic Materials", expected_return=0.170, volatility=0.220, max_drawdown=-0.270, sharpe_baseline=0.48, description="Patented agrochemical custom synthesis manufacturer (CSM) partnering with global innovators."),

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
    UniverseAsset(ticker="SILVERBEES.NS", name="Nippon India Silver ETF BeES", asset_class="commodity", sector="Precious Metals", expected_return=0.115, volatility=0.225, max_drawdown=-0.320, sharpe_baseline=0.22, description="Physical silver tracking industrial electrification and monetary demand with 0.52% TER."),
    UniverseAsset(ticker="TATSILV.NS", name="Tata Silver Exchange Traded Fund", asset_class="commodity", sector="Precious Metals", expected_return=0.115, volatility=0.222, max_drawdown=-0.320, sharpe_baseline=0.23, description="Physical silver bullion tracking industrial solar demand and monetary store of value with 0.40% TER."),
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
        "TCS.NS", "INFY.NS", "PERSISTENT.NS", "KPITTECH.NS", "DIXON.NS", "QQQ", "TITAN.NS",
        "BTC-USD", "EMBASSY_REIT", "GOLDBEES.NS",
    ],
    "New-Age Tech & Quick Commerce": [
        "SWIGGY.NS", "ZOMATO.NS", "PAYTM.NS", "NYKAA.NS", "POLICYBZR.NS", "BSE.NS", "CDSL.NS", "TRENT.NS",
    ],
    "Defense & Make in India": [
        "HAL.NS", "BEL.NS", "MAZDOCK.NS", "SOLARINDS.NS", "COCHINSHIP.NS", "LT.NS", "TITAGARH.NS",
    ],
    "Green Energy & Infrastructure": [
        "TATAPOWER.NS", "SUZLON.NS", "ADANIGREEN.NS", "JSWENERGY.NS", "IREDA.NS", "NTPC.NS", "POWERGRID.NS", "IRFC.NS",
    ],
    "High-Dividend PSU Champions": [
        "COALINDIA.NS", "PFC.NS", "RECLTD.NS", "ONGC.NS", "IOC.NS", "GAIL.NS", "SBIN.NS", "NTPC.NS",
    ],
}


import math
from pathlib import Path
import numpy as np
import pandas as pd


def get_enriched_universe_asset(ticker: str) -> UniverseAsset:
    """Enriches an asset profile with empirical historical statistics from DuckDB Parquet storage."""
    base_asset = UNIVERSE_BY_TICKER.get(ticker)
    if not base_asset:
        return UniverseAsset(
            ticker=ticker,
            name=ticker.replace(".NS", ""),
            asset_class="equity",
            sector="General Equity",
            expected_return=0.135,
            volatility=0.200,
            max_drawdown=-0.300,
            sharpe_baseline=0.35,
            description="NSE-listed equity security.",
            data_source="PARAMETRIC",
        )

    clean_symbol = ticker.replace(".NS", "").lower()
    parquet_path = Path("data/parquet/ohlcv") / f"bars_{clean_symbol}.parquet"
    if not parquet_path.exists():
        # Sovereign yield lookup if bond
        if ticker == "INDIA_GOVT_10Y":
            try:
                from arthaai.data.macro.macro_pipeline import get_macro_pipeline
                events = get_macro_pipeline().get_events()
                gsec = next((e for e in events if "10-year" in e.get("title", "").lower() or "benchmark" in e.get("title", "").lower()), None)
                if gsec:
                    y_val = float(str(gsec.get("actual", "6.82")).replace("%", "").strip()) / 100.0
                    return UniverseAsset(
                        ticker=base_asset.ticker,
                        name=f"Govt of India 10Y Sovereign Bond ({round(y_val*100, 2)}%)",
                        asset_class="debt",
                        sector=base_asset.sector,
                        expected_return=round(y_val, 4),
                        volatility=0.042,
                        max_drawdown=-0.045,
                        sharpe_baseline=round((y_val - 0.065) / 0.042, 2),
                        verified=True,
                        description="Zero default-risk sovereign paper benchmarked against RBI primary auction yield.",
                        latest_close=100.0,
                        data_source="RBI_PRIMARY_DEALER_GSEC",
                    )
            except Exception:
                pass
        return base_asset

    try:
        df = pd.read_parquet(parquet_path)
        if len(df) >= 30 and "close" in df.columns:
            closes = df["close"].dropna().values.astype(float)
            if len(closes) >= 30 and closes[0] > 0 and closes[-1] > 0:
                rets = np.diff(closes) / closes[:-1]
                daily_vol = float(np.std(rets))
                ann_vol = round(daily_vol * math.sqrt(252), 4)

                # Peak-to-trough maximum drawdown
                cum = np.cumprod(1.0 + rets)
                peak = np.maximum.accumulate(cum)
                drawdowns = (cum - peak) / peak
                max_dd = round(float(np.min(drawdowns)), 4)

                # Compounded annual growth rate over sample space
                years = max(1.0, len(closes) / 252.0)
                raw_cagr = (closes[-1] / closes[0]) ** (1.0 / years) - 1.0
                exp_ret = round(float(0.4 * raw_cagr + 0.6 * base_asset.expected_return), 4)
                exp_ret = max(0.065, min(0.25, exp_ret))

                latest_c = round(float(closes[-1]), 2)
                rf = 0.065
                sharpe = round((exp_ret - rf) / ann_vol, 2) if ann_vol > 0 else 0.0

                return UniverseAsset(
                    ticker=base_asset.ticker,
                    name=base_asset.name,
                    asset_class=base_asset.asset_class,
                    sector=base_asset.sector,
                    currency=base_asset.currency,
                    expected_return=exp_ret,
                    volatility=ann_vol,
                    max_drawdown=max_dd,
                    sharpe_baseline=sharpe,
                    verified=True,
                    description=base_asset.description,
                    latest_close=latest_c,
                    data_source="DUCKDB_PARQUET_VERIFIED",
                )
    except Exception:
        pass

    return base_asset


def get_universe(category: str | None = None, search: str | None = None, enrich_real_data: bool = True) -> list[UniverseAsset]:
    """Filters universe assets by asset_class and text search, dynamically enriched with DuckDB Parquet data."""
    results = [get_enriched_universe_asset(a.ticker) for a in UNIVERSE_ASSETS] if enrich_real_data else UNIVERSE_ASSETS
    if category and category != "all":
        results = [a for a in results if a.asset_class == category]
    if search:
        s = search.lower().strip()
        results = [
            a for a in results
            if s in a.ticker.lower() or s in a.name.lower() or s in a.sector.lower()
        ]
    return results
