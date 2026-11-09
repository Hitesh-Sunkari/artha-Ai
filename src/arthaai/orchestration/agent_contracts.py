"""Agent Contract Registry — Shared Pydantic contracts for the seven institutional research agents.

Defines the exact role, framework assignment, responsibilities, permitted tools,
required inputs, input artifact dependencies, expected output schemas, and completion criteria
for all seven agents in ArthaAI.
"""

from __future__ import annotations

from enum import Enum
from typing import Any
from pydantic import BaseModel, ConfigDict, Field

from arthaai.core.clock.timezone import now_utc


class AgentFramework(str, Enum):
    """Permitted agentic frameworks under system requirements."""

    GOOGLE_ADK = "GOOGLE_ADK"
    CREWAI = "CREWAI"


class AgentRole(str, Enum):
    """Canonical roles of the seven institutional specialists."""

    RESEARCH_MANAGER = "RESEARCH_MANAGER"
    QUANTITATIVE_SPECIALIST = "QUANTITATIVE_SPECIALIST"
    MICROSTRUCTURE_SPECIALIST = "MICROSTRUCTURE_SPECIALIST"
    NEWS_MACRO_SPECIALIST = "NEWS_MACRO_SPECIALIST"
    CORPORATE_FILING_SPECIALIST = "CORPORATE_FILING_SPECIALIST"
    ADVERSARIAL_SKEPTIC = "ADVERSARIAL_SKEPTIC"
    RISK_VALIDATOR = "RISK_VALIDATOR"


class AgentContract(BaseModel):
    """Audit-ready contract defining an agent's architectural boundaries."""

    model_config = ConfigDict(frozen=True)

    agent_id: str = Field(..., description="Unique agent identifier, e.g. 'adk_research_manager'")
    role: AgentRole = Field(..., description="Canonical agent role enum")
    display_name: str = Field(..., description="Human-readable title")
    framework: AgentFramework = Field(..., description="Agent framework: GOOGLE_ADK or CREWAI")
    role_description: str = Field(..., description="Primary mandate in the institutional research pipeline")
    responsibilities: list[str] = Field(..., description="Concrete tasks and analytical duties")
    permitted_tools: list[str] = Field(..., description="Allowlisted FastMCP or local analytical tools")
    required_inputs: list[str] = Field(..., description="Mandatory input parameters")
    input_artifact_dependencies: list[str] = Field(
        default_factory=list,
        description="Blackboard artifact types consumed by this specialist"
    )
    expected_output_schema: str = Field(..., description="Pydantic schema name of emitted artifact")
    completion_criteria: list[str] = Field(..., description="Conditions for successful execution")
    limitation_policies: list[str] = Field(..., description="Safety and boundary rules (e.g. zero fabrication)")


CANONICAL_SEVEN_AGENTS: list[AgentContract] = [
    # -------------------------------------------------------------------------
    # Agent 1: Research Manager (Google ADK)
    # -------------------------------------------------------------------------
    AgentContract(
        agent_id="adk_research_manager",
        role=AgentRole.RESEARCH_MANAGER,
        display_name="Research Manager",
        framework=AgentFramework.GOOGLE_ADK,
        role_description="Supervisory orchestrator responsible for request validation, task planning, dependency dispatch, targeted recovery, and final Pydantic synthesis.",
        responsibilities=[
            "Validate and canonicalize input security requests against SecurityMaster.",
            "Formulate dependency-aware execution DAG across sequential, parallel, or hierarchical modes.",
            "Inspect upstream specialist contributions on Blackboard for completeness.",
            "Coordinate A2A bridge communication between ADK and CrewAI specialists.",
            "Enforce mandatory decision gates (Risk Validator and Skeptic approval).",
            "Synthesize canonical QuantitativeResearchReport with cryptographic audit hash."
        ],
        permitted_tools=[
            "query_market_data",
            "calculate_statutory_costs",
            "retrieve_regulatory_evidence",
            "validate_research_evidence"
        ],
        required_inputs=["symbol", "as_of_time", "run_id", "timeframe"],
        input_artifact_dependencies=[
            "market_data_and_quant_features",
            "microstructure_analysis",
            "news_macro_analysis",
            "corporate_filing_analysis",
            "adversarial_critique",
            "statutory_and_risk_validation"
        ],
        expected_output_schema="QuantitativeResearchReport",
        completion_criteria=[
            "All specialist contributions collected and validated on Blackboard.",
            "Risk Validator validation_outcome is explicitly PASSED.",
            "Zero lookahead leakage and zero fabricated scores in final report.",
            "Canonical recommendation emitted as BUY, HOLD, SELL, or INCONCLUSIVE."
        ],
        limitation_policies=[
            "Cannot override a BLOCKED gate from Risk Validator.",
            "Must preserve provisional plan without conviction score prior to final synthesis."
        ]
    ),

    # -------------------------------------------------------------------------
    # Agent 2: Quantitative Market Specialist (Google ADK)
    # -------------------------------------------------------------------------
    AgentContract(
        agent_id="adk_quant_specialist",
        role=AgentRole.QUANTITATIVE_SPECIALIST,
        display_name="Quantitative Market Specialist",
        framework=AgentFramework.GOOGLE_ADK,
        role_description="Computes historical returns, realized volatility, moving averages, Wilder RSI, drawdowns, and 5-year coverage metrics from verified market bars.",
        responsibilities=[
            "Retrieve point-in-time filtered historical bars via FastMCP query_market_data tool.",
            "Calculate simple returns, Bessel-corrected realized volatility, SMA, EMA, and Wilder RSI.",
            "Enforce strict lookback windows: return None instead of shortening window when history is insufficient.",
            "Audit single-day price changes against circuit filter limits and detect anomalous spikes.",
            "Calculate peak-to-trough drawdowns and 5-year observation coverage percentage."
        ],
        permitted_tools=["query_market_data", "calculate_quant_features"],
        required_inputs=["symbol", "as_of_time", "run_id"],
        input_artifact_dependencies=["research_plan_and_supervision"],
        expected_output_schema="AgentContribution",
        completion_criteria=[
            "Historical bars retrieved and point-in-time verified.",
            "Mathematical indicators computed without silent lookback window truncation.",
            "Data quality report generated with physical OHLC consistency checks."
        ],
        limitation_policies=[
            "Zero bar fabrication: if data is absent, emit empty_result=True and status=UNAVAILABLE.",
            "Never substitute annualization factor for observation count."
        ]
    ),

    # -------------------------------------------------------------------------
    # Agent 3: Derivatives & Microstructure Specialist (Google ADK)
    # -------------------------------------------------------------------------
    AgentContract(
        agent_id="adk_microstructure_specialist",
        role=AgentRole.MICROSTRUCTURE_SPECIALIST,
        display_name="Derivatives & Microstructure Specialist",
        framework=AgentFramework.GOOGLE_ADK,
        role_description="Models parametric bid-ask spread proxies, turnover, Amihud illiquidity, and reports derivative/orderbook capability boundaries.",
        responsibilities=[
            "Estimate effective bid-ask spread via Corwin-Schultz (2012) High-Low estimator.",
            "Calculate trailing 20-day average daily turnover in INR Crores and assign liquidity tier.",
            "Compute Amihud (2002) illiquidity ratio.",
            "Compute parametric turnover impact proxy, distinctly separated from standard Kyle's lambda.",
            "Explicitly check derivatives eligibility and audit options contract availability."
        ],
        permitted_tools=[],
        required_inputs=["symbol", "run_id"],
        input_artifact_dependencies=["market_data_and_quant_features"],
        expected_output_schema="AgentContribution",
        completion_criteria=[
            "Spread labeled strictly as ESTIMATED_PARAMETRIC.",
            "Effective slippage marked UNAVAILABLE_NO_ORDERBOOK_FEED to prevent depth fabrication.",
            "Options PCR, ATM IV, and Max Pain marked None when contract feeds are unattached."
        ],
        limitation_policies=[
            "Do not claim actual order flow or book depth from daily OHLCV bars.",
            "Do not fabricate options open interest, PCR, or Greeks."
        ]
    ),

    # -------------------------------------------------------------------------
    # Agent 4: News & Macro Specialist (CrewAI)
    # -------------------------------------------------------------------------
    AgentContract(
        agent_id="crewai_news_macro_specialist",
        role=AgentRole.NEWS_MACRO_SPECIALIST,
        display_name="News & Macro Specialist",
        framework=AgentFramework.CREWAI,
        role_description="Audits macroeconomic monetary policy frameworks, RBI policy corridor, inflation targets, and macroeconomic sentiment.",
        responsibilities=[
            "Retrieve authoritative RBI monetary policy framework chunks from grounded ChromaDB RAG.",
            "Extract policy repo rate (6.50%), SDF, MSF corridor, and CPI tolerance bands.",
            "Call LLM adapter for structured macroeconomic thesis and systemic liquidity assessment.",
            "Preserve exact passage citations, source authorities, and publication dates."
        ],
        permitted_tools=["retrieve_regulatory_evidence"],
        required_inputs=["symbol", "run_id"],
        input_artifact_dependencies=["research_plan_and_supervision"],
        expected_output_schema="AgentContribution",
        completion_criteria=[
            "Macroeconomic policy regime anchored to verified RBI regulatory documents.",
            "Exact passage citations preserved in evidence_citations.",
            "Structured LLM analysis generated without raw model names or emojis."
        ],
        limitation_policies=[
            "Do not invent unsourced breaking news.",
            "Separate statutory monetary framework from unverified market gossip."
        ]
    ),

    # -------------------------------------------------------------------------
    # Agent 5: Fundamentals & Corporate Filings Specialist (CrewAI)
    # -------------------------------------------------------------------------
    AgentContract(
        agent_id="crewai_corporate_filing_specialist",
        role=AgentRole.CORPORATE_FILING_SPECIALIST,
        display_name="Fundamentals & Corporate Filings Specialist",
        framework=AgentFramework.CREWAI,
        role_description="Audits quarterly financial results disclosures, audit opinions, and statutory disclosures under SEBI LODR 2015 Regulations 30 and 33.",
        responsibilities=[
            "Query grounded ChromaDB RAG for company-specific quarterly disclosures and auditor reports.",
            "Evaluate governance compliance under SEBI LODR 2015 Regulation 33 (Financial Results) and Regulation 30 (Material Disclosures).",
            "Verify auditor opinion (e.g. limited review report, clean unqualified opinion).",
            "Call LLM adapter for structured corporate governance verdict and transparency assessment."
        ],
        permitted_tools=["retrieve_regulatory_evidence"],
        required_inputs=["symbol", "run_id"],
        input_artifact_dependencies=["research_plan_and_supervision"],
        expected_output_schema="AgentContribution",
        completion_criteria=[
            "Company-specific quarterly disclosure audited where available in corpus.",
            "Distinguish verified company filings from generic SEBI regulatory baseline.",
            "If company disclosure is absent, record limitation and set compliance to unverified."
        ],
        limitation_policies=[
            "Regulatory frameworks explain rules; they cannot independently prove company compliance without company filings.",
            "Do not insert generic citations solely to satisfy evidence count."
        ]
    ),

    # -------------------------------------------------------------------------
    # Agent 6: Adversarial Skeptic (CrewAI)
    # -------------------------------------------------------------------------
    AgentContract(
        agent_id="crewai_adversarial_specialist",
        role=AgentRole.ADVERSARIAL_SKEPTIC,
        display_name="Adversarial Skeptic",
        framework=AgentFramework.CREWAI,
        role_description="Critiques draft research thesis, tests contradictory evidence, and executes five deterministic quantitative stress tests.",
        responsibilities=[
            "Challenge bullish or momentum assumptions against structural downtrend and volatility regimes.",
            "Execute deterministic stress tests: circuit filter boundary, 2x volatility jump VaR, statutory drag coverage, 50% liquidity contraction, and lookahead leakage audit.",
            "Emit structured objections (e.g. CIRCUIT_FILTER_BREACH, NEGATIVE_RETURN_STATUTORY_DRAG).",
            "Record reproducible stress test input artifacts, formulas, thresholds, and actual results."
        ],
        permitted_tools=[],
        required_inputs=["symbol", "run_id", "upstream_context"],
        input_artifact_dependencies=[
            "market_data_and_quant_features",
            "microstructure_analysis",
            "news_macro_analysis"
        ],
        expected_output_schema="AgentContribution",
        completion_criteria=[
            "All five stress tests executed deterministically with explicit PASS, FAIL, or NOT_RUN status.",
            "Objections classified and persisted in findings.",
            "Analytical verdict emitted as APPROVED, REJECTED, or CONDITIONALLY_APPROVED."
        ],
        limitation_policies=[
            "Cannot approve a thesis when required quantitative observations are missing.",
            "Stress test status cannot be marked PASS without actual computed execution results."
        ]
    ),

    # -------------------------------------------------------------------------
    # Agent 7: Risk & Validation Officer (Google ADK)
    # -------------------------------------------------------------------------
    AgentContract(
        agent_id="adk_risk_validator",
        role=AgentRole.RISK_VALIDATOR,
        display_name="Risk & Validation Officer",
        framework=AgentFramework.GOOGLE_ADK,
        role_description="Final deterministic risk gate: calculates exact statutory transaction costs (Finance Act 2024), validates live trading prohibition, and audits all Skeptic objections.",
        responsibilities=[
            "Invoke FastMCP calculate_statutory_costs tool for exact STT, GST, Stamp Duty, Exchange & SEBI fees.",
            "Dynamically derive order quantity from reference ₹100,000 notional and latest close price.",
            "Assert live_trading_enabled is permanently False.",
            "Audit all material objections raised by the Skeptic: ensure zero critical unresolved contradictions.",
            "Enforce hard veto gate: block final recommendation if data quality, live trading, or critical objections fail."
        ],
        permitted_tools=["calculate_statutory_costs"],
        required_inputs=["symbol", "as_of_time", "run_id"],
        input_artifact_dependencies=[
            "market_data_and_quant_features",
            "adversarial_critique"
        ],
        expected_output_schema="AgentContribution",
        completion_criteria=[
            "FastMCP calculate_statutory_costs tool invoked and result stored on Blackboard.",
            "Live trading safety invariant verified.",
            "Every Skeptic objection classified (RESOLVED or UNRESOLVED).",
            "validation_outcome emitted as PASSED or BLOCKED."
        ],
        limitation_policies=[
            "Must block recommendation if live_trading_enabled is True or critical objections remain unresolved.",
            "Cannot use hardcoded cost drag defaults; must use exact calculation from transaction cost engine."
        ]
    ),
]


class AgentContractRegistry:
    """Registry maintaining and validating agent contracts."""

    def __init__(self) -> None:
        self._contracts: dict[str, AgentContract] = {c.agent_id: c for c in CANONICAL_SEVEN_AGENTS}

    def get_contract(self, agent_id: str) -> AgentContract | None:
        """Retrieves contract for the given agent_id."""
        return self._contracts.get(agent_id)

    def list_contracts(self) -> list[AgentContract]:
        """Returns all seven canonical agent contracts."""
        return list(self._contracts.values())

    def validate_tool_permission(self, agent_id: str, tool_name: str) -> bool:
        """Verifies if an agent is authorized to invoke a tool."""
        contract = self.get_contract(agent_id)
        if not contract:
            return False
        return tool_name in contract.permitted_tools

    def export_registry(self) -> dict[str, Any]:
        """Exports JSON-serializable registry representation."""
        return {
            "total_agents": len(self._contracts),
            "agents": [c.model_dump(mode="json") for c in self._contracts.values()]
        }


# Singleton accessor
_GLOBAL_AGENT_REGISTRY: AgentContractRegistry | None = None


def get_agent_contract_registry() -> AgentContractRegistry:
    """Returns singleton instance of AgentContractRegistry."""
    global _GLOBAL_AGENT_REGISTRY
    if _GLOBAL_AGENT_REGISTRY is None:
        _GLOBAL_AGENT_REGISTRY = AgentContractRegistry()
    return _GLOBAL_AGENT_REGISTRY


# ============================================================================
# Research Task Plan & Execution Node Models
# ============================================================================

class TaskNodeStatus(str, Enum):
    """Execution status of an individual task node in the research plan."""

    PENDING = "PENDING"
    RUNNING = "RUNNING"
    COMPLETED = "COMPLETED"
    FAILED = "FAILED"
    RETRYING = "RETRYING"
    BLOCKED = "BLOCKED"
    SKIPPED = "SKIPPED"


class TaskExecutionNode(BaseModel):
    """An individual execution node in the dependency-aware research plan."""

    model_config = ConfigDict(frozen=False)

    task_id: str = Field(..., description="Unique node ID, e.g. 'task-adk_quant_specialist'")
    agent_id: str = Field(..., description="Target specialist agent ID")
    framework: AgentFramework = Field(..., description="Agent framework: GOOGLE_ADK or CREWAI")
    task_name: str = Field(..., description="Task namespace name")
    dependencies: list[str] = Field(default_factory=list, description="IDs of preceding tasks required before dispatch")
    required_input_artifacts: list[str] = Field(default_factory=list, description="Required Blackboard artifact keys")
    expected_output_schema: str = Field(default="AgentContribution", description="Expected output schema name")
    status: TaskNodeStatus = Field(default=TaskNodeStatus.PENDING, description="Execution status of this node")
    retry_count: int = Field(default=0, description="Number of attempted recoveries")
    max_retries: int = Field(default=2, description="Maximum bounded retries permitted")
    start_time: str | None = Field(default=None, description="ISO-8601 UTC start time")
    end_time: str | None = Field(default=None, description="ISO-8601 UTC completion time")
    duration_ms: float | None = Field(default=None, description="Execution latency in milliseconds")
    artifact_id: str | None = Field(default=None, description="Published Blackboard artifact identifier")
    error_message: str | None = Field(default=None, description="Last error message if failed")
    validation_errors: list[str] = Field(default_factory=list, description="Contract validation breaches")


class ResearchTaskPlan(BaseModel):
    """Formal dependency-aware multi-agent task execution plan created by the Research Manager."""

    model_config = ConfigDict(frozen=False)

    plan_id: str = Field(..., description="Unique execution plan ID")
    run_id: str = Field(..., description="Correlated research run ID")
    symbol: str = Field(..., description="Target Indian security symbol")
    orchestration_pattern: str = Field(..., description="Execution mode: SEQUENTIAL, PARALLEL, HIERARCHICAL")
    data_coverage_summary: dict[str, Any] = Field(default_factory=dict, description="Audit of available data before planning")
    nodes: list[TaskExecutionNode] = Field(default_factory=list, description="Ordered execution nodes")
    created_at: str = Field(default_factory=lambda: now_utc().isoformat(), description="Creation timestamp")

    def get_node(self, task_id: str) -> TaskExecutionNode | None:
        """Finds a task node by its unique task_id."""
        for node in self.nodes:
            if node.task_id == task_id:
                return node
        return None

    def get_node_by_agent(self, agent_id: str) -> TaskExecutionNode | None:
        """Finds a task node by its agent_id."""
        for node in self.nodes:
            if node.agent_id == agent_id:
                return node
        return None

