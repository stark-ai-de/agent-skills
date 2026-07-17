# ML Training and Inference Boundary

## Prompt

```text
Create an editable draw.io ML system diagram showing feature ingestion, training, evaluation, a versioned model artifact, deployment, online inference, and prediction monitoring. Include representative tensor or feature shapes and keep animation enabled.
```

## Should Trigger

Yes

## Expected Behavior

- Separate training and inference paths with an explicit model-artifact handoff and version cue.
- Show relevant feature/tensor shapes, transformation roles, evaluation/monitoring metrics, and runtime inputs/outputs without drawing every neuron.
- Animate directed data and inference execution flows while keeping model/layer structure, artifact ownership, and boundaries static.
- Use logos only for real named platforms; generic ML stages retain precise labelled notation.

## Deterministic Assertions

- regex: training.*inference|inference.*training
- regex: tensor|feature shape
- regex: model artifact|versioned model
- regex: metric|monitoring
- regex: animat.{0,}(data|inference)|flowAnimation
- contains: validate_drawio.py
