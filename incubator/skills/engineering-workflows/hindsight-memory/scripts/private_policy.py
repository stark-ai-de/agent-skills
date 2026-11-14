"""Keep Hindsight document storage private while preserving bank features."""

from hindsight_api.config import HindsightConfig
from hindsight_api.extensions.builtin.tenant import ApiKeyTenantExtension
from hindsight_api.extensions.operation_validator import OperationValidatorExtension, ValidationResult


_ALLOWED_FIELDS = frozenset(HindsightConfig.get_configurable_fields() - {"store_document_text"})


class PrivateTenantExtension(ApiKeyTenantExtension):
    async def get_allowed_config_fields(self, context, bank_id):
        return _ALLOWED_FIELDS


class PrivateStorageValidator(OperationValidatorExtension):
    async def validate_retain(self, ctx):
        try:
            engine = self.context.get_memory_engine()
            # shortcut: pinned Hindsight 1.2.1 has no public resolved-config API for validators; revisit on upgrade.
            resolved = await engine._config_resolver.resolve_full_config(ctx.bank_id, ctx.request_context)
            if resolved.store_document_text is not False:
                return ValidationResult.reject("Raw document storage is not allowed")
        except Exception:
            return ValidationResult.reject("Cannot verify private document storage")
        return ValidationResult.accept()

    async def validate_recall(self, ctx):
        return ValidationResult.accept()

    async def validate_reflect(self, ctx):
        return ValidationResult.accept()
