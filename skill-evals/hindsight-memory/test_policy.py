import asyncio
import importlib.util
from pathlib import Path
import sys
import types
import unittest
from unittest.mock import patch


class Config:
    @staticmethod
    def get_configurable_fields():
        return {"store_document_text", "retain_mission"}


class Result:
    @staticmethod
    def accept():
        return True

    @staticmethod
    def reject(reason):
        return False


modules = {
    "hindsight_api": types.ModuleType("hindsight_api"),
    "hindsight_api.config": types.ModuleType("hindsight_api.config"),
    "hindsight_api.extensions": types.ModuleType("hindsight_api.extensions"),
    "hindsight_api.extensions.builtin": types.ModuleType("hindsight_api.extensions.builtin"),
    "hindsight_api.extensions.builtin.tenant": types.ModuleType("hindsight_api.extensions.builtin.tenant"),
    "hindsight_api.extensions.operation_validator": types.ModuleType("hindsight_api.extensions.operation_validator"),
}
modules["hindsight_api.config"].HindsightConfig = Config
modules["hindsight_api.extensions.builtin.tenant"].ApiKeyTenantExtension = type("Tenant", (), {})
modules["hindsight_api.extensions.operation_validator"].OperationValidatorExtension = type("Validator", (), {})
modules["hindsight_api.extensions.operation_validator"].ValidationResult = Result
source = Path(__file__).resolve().parents[2] / "incubator/skills/engineering-workflows/hindsight-memory/scripts/private_policy.py"
spec = importlib.util.spec_from_file_location("private_policy", source)
policy = importlib.util.module_from_spec(spec)
with patch.dict(sys.modules, modules):
    spec.loader.exec_module(policy)


class PolicyTests(unittest.TestCase):
    def test_only_storage_setting_is_removed(self):
        allowed = asyncio.run(policy.PrivateTenantExtension().get_allowed_config_fields(None, "test"))
        self.assertEqual(allowed, {"retain_mission"})

    def test_retain_requires_verified_private_storage(self):
        class Resolver:
            def __init__(self, value):
                self.value = value

            async def resolve_full_config(self, bank, context):
                if self.value is None:
                    raise RuntimeError("database unavailable")
                return types.SimpleNamespace(store_document_text=self.value)

        validator = policy.PrivateStorageValidator()
        ctx = types.SimpleNamespace(bank_id="test", request_context=None)
        for value, expected in ((False, True), (True, False), (None, False)):
            engine = types.SimpleNamespace(_config_resolver=Resolver(value))
            validator.context = types.SimpleNamespace(get_memory_engine=lambda: engine)
            self.assertIs(asyncio.run(validator.validate_retain(ctx)), expected)


if __name__ == "__main__":
    unittest.main()
