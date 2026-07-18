from __future__ import annotations

import asyncio
from collections.abc import AsyncGenerator
from pathlib import Path
import shutil
from typing import TYPE_CHECKING, Literal
from urllib.parse import urlparse

from pydantic import BaseModel, ConfigDict, Field

from vibe.core.tools.base import (
    BaseTool,
    BaseToolConfig,
    BaseToolState,
    InvokeContext,
    ToolError,
    ToolPermission,
)
from vibe.core.tools.permissions import (
    PermissionContext,
    PermissionScope,
    RequiredPermission,
)
from vibe.core.tools.ui import ToolCallDisplay, ToolResultDisplay, ToolUIData
from vibe.core.types import ToolStreamEvent

if TYPE_CHECKING:
    from vibe.core.config import AnyVibeConfig


class VerifyWebAppArgs(BaseModel):
    model_config = ConfigDict(extra="forbid")

    target_url: str = Field(
        description="HTTP or HTTPS URL of the web application to verify"
    )
    effort: Literal["low", "mid", "high", "xhigh", "ultra"] | None = Field(
        default=None,
        description="Verification depth; defaults to the configured effort",
    )


class VerifyWebAppFinding(BaseModel):
    model_config = ConfigDict(extra="forbid")

    title: str
    severity: Literal["critical", "high", "medium"]
    root_cause: str
    repro_steps: list[str]
    evidence_path: str | None = None


class VerifyWebAppResult(BaseModel):
    model_config = ConfigDict(extra="forbid")

    verdict: Literal["pass", "fail", "inconclusive"]
    summary: str
    flows_tested: int = Field(ge=0)
    findings: list[VerifyWebAppFinding]
    generated_tests: list[str]
    report_path: str


class VerifyWebAppConfig(BaseToolConfig):
    permission: ToolPermission = ToolPermission.ASK
    executable: str = Field(
        default="clanker-watchdog",
        description="Clanker Watchdog executable name or absolute path.",
    )
    default_effort: Literal["low", "mid", "high", "xhigh", "ultra"] = "mid"
    timeout_seconds: int = Field(default=900, ge=1, le=3600)
    max_output_bytes: int = Field(default=1_000_000, ge=1024)


def _configured_executable(config: AnyVibeConfig | None) -> str:
    if config is None:
        return "clanker-watchdog"
    raw = config.tools.get("verify_web_app", {}).get("executable", "clanker-watchdog")
    return raw if isinstance(raw, str) else "clanker-watchdog"


def _resolve_executable(executable: str) -> str | None:
    candidate = Path(executable).expanduser()
    if candidate.is_absolute() or candidate.parent != Path("."):
        return str(candidate) if candidate.is_file() else None
    return shutil.which(executable)


class VerifyWebApp(
    BaseTool[VerifyWebAppArgs, VerifyWebAppResult, VerifyWebAppConfig, BaseToolState],
    ToolUIData[VerifyWebAppArgs, VerifyWebAppResult],
):
    @classmethod
    def is_available(cls, config: AnyVibeConfig | None = None) -> bool:
        return _resolve_executable(_configured_executable(config)) is not None

    def resolve_permission(self, args: VerifyWebAppArgs) -> PermissionContext | None:
        if self.config.permission in {ToolPermission.ALWAYS, ToolPermission.NEVER}:
            return PermissionContext(permission=self.config.permission)

        parsed = urlparse(args.target_url)
        target = parsed.netloc or args.target_url
        return PermissionContext(
            permission=ToolPermission.ASK,
            reason=(
                "Clanker Watchdog drives a real browser and may submit forms or "
                "change data in the target application."
            ),
            required_permissions=[
                RequiredPermission(
                    scope=PermissionScope.URL_PATTERN,
                    invocation_pattern=target,
                    session_pattern=target,
                    label=f"browser verification of {target}",
                )
            ],
        )

    async def run(
        self, args: VerifyWebAppArgs, ctx: InvokeContext | None = None
    ) -> AsyncGenerator[ToolStreamEvent | VerifyWebAppResult, None]:
        parsed = urlparse(args.target_url)
        if parsed.scheme not in {"http", "https"} or not parsed.netloc:
            raise ToolError("target_url must be a fully qualified HTTP or HTTPS URL")

        executable = _resolve_executable(self.config.executable)
        if executable is None:
            raise ToolError(
                f"Clanker Watchdog executable not found: {self.config.executable}"
            )

        process = await asyncio.create_subprocess_exec(
            executable,
            args.target_url,
            "--effort",
            args.effort or self.config.default_effort,
            "--provider",
            "mistral",
            "--output",
            "json",
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.PIPE,
        )

        try:
            stdout, stderr = await asyncio.wait_for(
                process.communicate(), timeout=self.config.timeout_seconds
            )
        except TimeoutError as error:
            process.kill()
            await process.wait()
            raise ToolError(
                "Clanker Watchdog timed out after "
                f"{self.config.timeout_seconds} seconds"
            ) from error
        except asyncio.CancelledError:
            process.terminate()
            await process.wait()
            raise

        if len(stdout) > self.config.max_output_bytes:
            raise ToolError(
                "Clanker Watchdog JSON output exceeded the configured limit"
            )
        if process.returncode != 0:
            diagnostic = stderr[-self.config.max_output_bytes :].decode(
                "utf-8", errors="replace"
            )
            raise ToolError(
                f"Clanker Watchdog exited with status {process.returncode}: "
                f"{diagnostic.strip() or 'no diagnostic output'}"
            )

        try:
            result = VerifyWebAppResult.model_validate_json(stdout)
        except ValueError as error:
            raise ToolError("Clanker Watchdog returned invalid JSON output") from error

        yield result

    @classmethod
    def format_call_display(cls, args: VerifyWebAppArgs) -> ToolCallDisplay:
        effort = args.effort or "configured effort"
        return ToolCallDisplay(
            summary=f"Watching application: {args.target_url}", suffix=f"({effort})"
        )

    @classmethod
    def format_result_display(cls, result: VerifyWebAppResult) -> ToolResultDisplay:
        failure_count = len(result.findings)
        return ToolResultDisplay(
            success=result.verdict == "pass",
            message=(
                f"{result.verdict.upper()} · {result.flows_tested} flows tested · "
                f"{failure_count} reproduced failures"
            ),
        )

    @classmethod
    def get_status_text(cls) -> str:
        return "Watching application"
