# Kubernetes Cluster Diagram

## Prompt

```text
Use $drawio-diagrams to create an editable Kubernetes cluster diagram with ingress, service, deployment, pods, config map, secret, and persistent volume.
```

## Should Trigger

Yes

## Expected Behavior

- Group cluster resources into a clear boundary.
- Use readable labels and consistent icon or generic-shape style.
- Avoid exposing secret values in the diagram.
- Validate the `.drawio` XML and report warnings.

## Deterministic Assertions

- contains: Secret
- contains: values
- contains: validate_drawio.py
