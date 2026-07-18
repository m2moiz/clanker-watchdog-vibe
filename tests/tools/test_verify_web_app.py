from __future__ import annotations

import asyncio

import pytest

from tests.mock.utils import collect_result
from vibe.core.tools.base import BaseToolState, ToolError, ToolPermission
from vibe.core.tools.builtins.verify_web_app import (
    VerifyWebApp,
    VerifyWebAppArgs,
    VerifyWebAppConfig,
    VerifyWebAppResult,
)
from vibe.core.tools.permissions import PermissionScope


class FakeProcess:
    def __init__(
        self, stdout: bytes = b"", stderr: bytes = b"", returncode: int = 0
    ) -> None:
        self.stdout = stdout
        self.stderr = stderr
        self.returncode = returncode

    async def communicate(self) -> tuple[bytes, bytes]:
        return self.stdout, self.stderr

    def kill(self) -> None:
        pass

    def terminate(self) -> None:
        pass

    async def wait(self) -> int:
        return self.returncode


@pytest.fixture
def tool(monkeypatch: pytest.MonkeyPatch) -> VerifyWebApp:
    monkeypatch.setattr(
        "vibe.core.tools.builtins.verify_web_app._resolve_executable",
        lambda _executable: "/bin/clanker-watchdog",
    )
    config = VerifyWebAppConfig()
    return VerifyWebApp(config_getter=lambda: config, state=BaseToolState())


@pytest.mark.asyncio
async def test_returns_typed_verification_result(
    tool: VerifyWebApp, monkeypatch: pytest.MonkeyPatch
) -> None:
    process = FakeProcess(
        stdout=b"""{
          "verdict":"fail",
          "summary":"A defect was reproduced.",
          "flows_tested":2,
          "findings":[{
            "title":"Cart badge remains stale",
            "severity":"high",
            "root_cause":"State is not refreshed.",
            "repro_steps":["Add item"],
            "evidence_path":".autoend/evidence/cart.webm"
          }],
          "generated_tests":[".autoend/flows/cart/flow.mts"],
          "report_path":".autoend/runs/1/report.json"
        }"""
    )

    async def create_process(*_args, **_kwargs):
        return process

    monkeypatch.setattr(asyncio, "create_subprocess_exec", create_process)
    result = await collect_result(
        tool.run(VerifyWebAppArgs(target_url="http://localhost:3000", effort="mid"))
    )

    assert result.verdict == "fail"
    assert result.findings[0].title == "Cart badge remains stale"


@pytest.mark.asyncio
async def test_rejects_invalid_target(tool: VerifyWebApp) -> None:
    with pytest.raises(ToolError, match="fully qualified"):
        await collect_result(tool.run(VerifyWebAppArgs(target_url="localhost:3000")))


@pytest.mark.asyncio
async def test_reports_nonzero_exit(
    tool: VerifyWebApp, monkeypatch: pytest.MonkeyPatch
) -> None:
    process = FakeProcess(stderr=b"browser failed", returncode=3)

    async def create_process(*_args, **_kwargs):
        return process

    monkeypatch.setattr(asyncio, "create_subprocess_exec", create_process)
    with pytest.raises(ToolError, match="status 3.*browser failed"):
        await collect_result(
            tool.run(VerifyWebAppArgs(target_url="https://example.com"))
        )


@pytest.mark.asyncio
async def test_rejects_malformed_output(
    tool: VerifyWebApp, monkeypatch: pytest.MonkeyPatch
) -> None:
    process = FakeProcess(stdout=b"not-json")

    async def create_process(*_args, **_kwargs):
        return process

    monkeypatch.setattr(asyncio, "create_subprocess_exec", create_process)
    with pytest.raises(ToolError, match="invalid JSON"):
        await collect_result(
            tool.run(VerifyWebAppArgs(target_url="https://example.com"))
        )


def test_requests_browser_permission(tool: VerifyWebApp) -> None:
    permission = tool.resolve_permission(
        VerifyWebAppArgs(target_url="http://localhost:3000")
    )

    assert permission is not None
    assert permission.permission is ToolPermission.ASK
    assert permission.required_permissions[0].scope is PermissionScope.URL_PATTERN
    assert "submit forms" in (permission.reason or "")


def test_display_summarizes_verdict() -> None:
    result = VerifyWebAppResult.model_validate({
        "verdict": "pass",
        "summary": "All clear.",
        "flows_tested": 4,
        "findings": [],
        "generated_tests": [],
        "report_path": ".autoend/runs/1/report.json",
    })
    display = VerifyWebApp.format_result_display(result)
    assert display.success is True
    assert display.message == "PASS · 4 flows tested · 0 reproduced failures"
