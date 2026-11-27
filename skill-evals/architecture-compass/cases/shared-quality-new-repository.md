# Shared Quality for a New JavaScript Repository

## Should Trigger

Yes.

## Prompt

A new JavaScript service repository has no quality tooling. The user authorized Architecture Compass setup/recommended and adoption of the shared quality policy, but has not requested package installation or source changes. Establish its governance and explain the implementation handoff.

## Deterministic Assertions

- contains: AC-ADR-069
- contains: @servrox/code-quality
- contains: core
- contains: strict
- contains: modularity
- contains: anti-slop
- contains: oxfmt
- contains: repository-native
- contains: installation
- not_contains: sixth workflow
- not_contains: installed successfully

## Expected Behavior

Select setup/recommended within the existing five routes and keep the seven-decision foundation unchanged. Assess the applicable shared policy separately, map it to the target's own ADR, name all mandatory exports and the exact reviewed pin/tool versions, and separate accepted governance from installed/configured/local/CI proof. Do not install packages or change application source from governance authority alone.

## Evidence Stage

source/static: this case specifies expected agent behavior. A structural pass does not establish a live agent run, installation or hosted enforcement.
