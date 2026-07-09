# Edit Existing Diagram

Prompt:

```text
Use $drawio-diagrams to edit this existing Client -> API -> Database draw.io file and add Redis as a cache without disturbing the existing nodes.
```

Expected: activate. The skill should read the existing file first, preserve unknown cells and stable IDs, create a backup or alternate output before overwrite, add the smallest safe change, validate the edited page, and report any warnings.
