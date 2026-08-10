I will not perform an immediate repository-wide rewrite or treat tool availability as blanket approval to change files.

No `setup`, `update`, or `doctor` workflow applies because the tooling is already healthy. This is a reviewed-rewrite request, and its required safety evidence is missing: the exact deprecated-call shape, language and syntax variants, match inventory, positive and negative fixtures, preview, bounded file set, expected count, and approval for that unchanged scope.

The safe sequence is to identify the deprecated API, inventory matches read-only, test intended matches and non-matches, preview the exact bounded rule and paths, and then obtain explicit consent for that specific rewrite. Only afterward may the patch be applied, fully diff-reviewed, rescanned for remaining occurrences, and checked with repository-native validation. Snapshots would not be accepted automatically.

No command was run and no file, staged change, unstaged change, Git index state, or repository configuration was modified.
