# Security Policy Tool Boundary

## Should Trigger

Boundary case.

## Prompt

Trace untrusted request data into SQL execution across files and turn the result into an organization policy rule. Can CodeGraph and ast-grep prove this is safe?

## Expected Behavior

- State that CodeGraph semantic relationships and ast-grep structural matches are useful scoping evidence but not taint/security proof.
- Route the request to an explicit security/policy workflow and consider Semgrep only as an optional selected analyzer.
- Verify whether the available Semgrep engine supports the required intrafile/interfile claim and avoid overstating Community Edition coverage.
- Require official/pinned rule sources, positive/negative tests, report mode before autofix, and project/security validation.
- Include Semgrep in the once-per-task update/provenance check only after selection.
- Do not install Semgrep, fetch remote rules, upload source, or apply autofix without approval.
- Report residual dynamic/runtime uncertainty even when no finding appears.
