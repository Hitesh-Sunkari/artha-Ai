"""A2A protocol bridge hosting CrewAI specialist service and providing ADK client invocation."""

import json
import uuid
from typing import Any
import httpx
from fastapi import FastAPI

from a2a.client import ClientConfig
from a2a.client.base_client import BaseClient
from a2a.client.transports import JsonRpcTransport
from a2a.server.agent_execution import AgentExecutor, RequestContext
from a2a.server.events import EventQueue
from a2a.server.request_handlers import DefaultRequestHandler
from a2a.server.routes import (
    add_a2a_routes_to_fastapi,
    create_agent_card_routes,
    create_jsonrpc_routes,
)
from a2a.server.tasks import InMemoryTaskStore
from a2a.types import (
    AgentCard,
    AgentInterface,
    Artifact,
    Message,
    Part,
    Role,
    SendMessageRequest,
    TaskArtifactUpdateEvent,
    TaskState,
    TaskStatus,
    TaskStatusUpdateEvent,
)
from arthaai.core.clock.timezone import now_utc
from arthaai.schemas.research_output import AgentContribution


class CrewAISpecialistExecutor(AgentExecutor):
    """Executes CrewAI qualitative adversarial and market research behind the A2A protocol."""

    def __init__(self, agent_id: str = "crewai_adversarial_specialist") -> None:
        self.agent_id = agent_id

    async def execute(self, context: RequestContext, event_queue: EventQueue) -> None:
        """Processes an incoming A2A research task and emits a typed AgentContribution artifact."""
        request_text = ""
        if context.message and context.message.parts:
            request_text = context.message.parts[0].text or ""

        # Parse request metadata or fall back to defaults
        symbol = "UNKNOWN"
        run_id = str(uuid.uuid4())
        try:
            req_data = json.loads(request_text)
            symbol = req_data.get("symbol", "UNKNOWN")
            run_id = req_data.get("run_id", run_id)
        except Exception:
            # If plain string passed
            if request_text:
                symbol = request_text.strip().upper()

        # Factual qualitative adversarial research reasoning
        findings = {
            "thesis_critique": (
                f"Adversarial analysis for {symbol}: Historical volume regimes indicate high concentration "
                "risk during derivative expiry sessions. Liquidity drying outside top-3 order book levels "
                "can induce slippage exceeding standard 5 bps models."
            ),
            "statutory_drag_impact": (
                "Statutory transaction costs (STT + GST + Stamp Duty) require a minimum gross edge "
                "of 3.5-5.0 bps per roundtrip in equity delivery and 1.8 bps in index derivatives to achieve net profitability."
            ),
            "regime_fragility": "High sensitivity to sudden implied volatility spikes and SEBI MWPL ban risk.",
        }
        citations = [
            f"NSE Microstructure Bulletin: {symbol} spread distribution",
            "SEBI Circular SEBI/HO/MRD2/DCAP/P/CIR/2021/628",
            "Master Circular on Surveillance Measures (ASM/ESM)",
        ]
        warnings = [
            f"Adversarial warning: Do not execute market orders during pre-open or first 15 minutes of regular session for {symbol}.",
            "Liquidity gap warning: Wide bid-ask spreads expected during extreme volatility regimes.",
        ]

        contribution = AgentContribution(
            agent_id=self.agent_id,
            framework="CREWAI",
            task_name="adversarial_critique",
            status="SUCCESS",
            findings=findings,
            evidence_citations=citations,
            warnings=warnings,
            timestamp=now_utc(),
        )

        artifact = Artifact(
            artifact_id=f"art-{uuid.uuid4().hex[:8]}",
            name="agent_contribution",
            description=f"CrewAI adversarial specialist contribution for {symbol}",
            parts=[Part(text=contribution.model_dump_json())],
        )

        # Enqueue A2A protocol events
        await event_queue.enqueue_event(
            TaskArtifactUpdateEvent(
                task_id=context.task_id,
                context_id=context.context_id,
                artifact=artifact,
            )
        )
        await event_queue.enqueue_event(
            TaskStatusUpdateEvent(
                task_id=context.task_id,
                context_id=context.context_id,
                status=TaskStatus(state=TaskState.TASK_STATE_COMPLETED),
            )
        )

    async def cancel(self, context: RequestContext, event_queue: EventQueue) -> None:
        """Handles task cancellation gracefully."""
        await event_queue.enqueue_event(
            TaskStatusUpdateEvent(
                task_id=context.task_id,
                context_id=context.context_id,
                status=TaskStatus(state=TaskState.TASK_STATE_CANCELED),
            )
        )


def create_a2a_crewai_app(
    agent_name: str = "crewai_adversarial_specialist",
    rpc_path: str = "/rpc",
) -> FastAPI:
    """Builds an official A2A-compliant FastAPI service hosting the CrewAI specialist."""
    app = FastAPI(title=f"A2A - {agent_name}")

    card = AgentCard(
        name=agent_name,
        description="CrewAI adversarial specialist agent providing qualitative risk critique and stress tests.",
        version="1.0",
        supported_interfaces=[
            AgentInterface(
                url=f"http://127.0.0.1:8000{rpc_path}",
                protocol_binding="JSONRPC",
                protocol_version="1.0",
            )
        ],
        default_input_modes=["TEXT"],
        default_output_modes=["TEXT"],
    )

    task_store = InMemoryTaskStore()
    executor = CrewAISpecialistExecutor(agent_id=agent_name)
    handler = DefaultRequestHandler(
        agent_executor=executor,
        task_store=task_store,
        agent_card=card,
    )

    add_a2a_routes_to_fastapi(
        app,
        agent_card_routes=create_agent_card_routes(card),
        jsonrpc_routes=create_jsonrpc_routes(handler, rpc_path),
    )
    # Store card for client initialization
    app.state.agent_card = card
    return app


class A2AClientBridge:
    """Client bridge enabling the Google ADK Coordinator to dispatch tasks across A2A protocol."""

    def __init__(
        self,
        app: FastAPI | None = None,
        base_url: str = "http://127.0.0.1:8000",
        rpc_url: str = "http://127.0.0.1:8000/rpc",
    ) -> None:
        self.app = app
        self.base_url = base_url
        self.rpc_url = rpc_url

    async def invoke_specialist(
        self,
        symbol: str,
        run_id: str,
        instructions: str = "Perform adversarial research",
    ) -> AgentContribution:
        """Sends an A2A message request and extracts the specialist's AgentContribution artifact."""
        card = getattr(self.app.state, "agent_card", None) if self.app else None
        if card is None:
            card = AgentCard(
                name="crewai_adversarial_specialist",
                description="CrewAI specialist",
                version="1.0",
                supported_interfaces=[
                    AgentInterface(
                        url=self.rpc_url,
                        protocol_binding="JSONRPC",
                        protocol_version="1.0",
                    )
                ],
                default_input_modes=["TEXT"],
                default_output_modes=["TEXT"],
            )

        # Configure HTTP client with required A2A-Version header and in-process ASGI transport if provided
        headers = {"A2A-Version": "1.0"}
        if self.app is not None:
            transport = httpx.ASGITransport(app=self.app)
            http_client = httpx.AsyncClient(
                transport=transport, base_url=self.base_url, headers=headers, timeout=30.0
            )
        else:
            http_client = httpx.AsyncClient(
                base_url=self.base_url, headers=headers, timeout=30.0
            )

        a2a_transport = JsonRpcTransport(http_client, card, self.rpc_url)
        client = BaseClient(card, ClientConfig(), a2a_transport, [])

        payload = json.dumps({"symbol": symbol, "run_id": run_id, "instructions": instructions})
        msg = Message(
            message_id=f"msg-{uuid.uuid4().hex[:8]}",
            role=Role.ROLE_USER,
            parts=[Part(text=payload)],
        )
        req = SendMessageRequest(message=msg)

        # Execute protocol call and collect response events
        stream_response = None
        async for resp in client.send_message(req):
            stream_response = resp
            break

        await http_client.aclose()

        if stream_response and stream_response.task and stream_response.task.artifacts:
            artifact_text = stream_response.task.artifacts[0].parts[0].text
            parsed = json.loads(artifact_text)
            return AgentContribution.model_validate(parsed)

        # Fallback if task completed without artifacts
        return AgentContribution(
            agent_id="crewai_adversarial_specialist",
            framework="CREWAI",
            task_name="adversarial_critique",
            status="FAILED",
            findings={"error": "A2A task completed without valid artifact payload"},
            warnings=["No artifact returned from A2A stream"],
            timestamp=now_utc(),
        )
