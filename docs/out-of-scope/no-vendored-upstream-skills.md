# No Vendored Upstream Skills

Published third-party skills should not be copied into `skills/`.

When an upstream skill is useful as-is, install it project-locally with `npx skills` under ignored `.agents/`. Public skills in this repository must be original work, compatible with this repository's Apache-2.0 license, and maintained as part of this catalog.

This keeps the public catalog legally clear, avoids stale forks of actively maintained skills, and preserves `.agents/skills/` as the place for helper installs.
