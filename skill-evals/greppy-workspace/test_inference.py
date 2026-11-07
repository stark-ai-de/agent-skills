import importlib.util
from pathlib import Path
import sys
import unittest
from unittest.mock import patch

SCRIPTS = Path(__file__).resolve().parents[2] / 'incubator/skills/engineering-workflows/greppy-workspace/scripts'
sys.path.insert(0, str(SCRIPTS))
spec = importlib.util.spec_from_file_location('inference', SCRIPTS / 'inference.py')
m = importlib.util.module_from_spec(spec)
spec.loader.exec_module(m)


class InferenceTests(unittest.TestCase):
    def test_wrong_dimension_or_count_is_not_inference_proof(self):
        for vectors in ([], [[1, 2]], [[1, 2, 3], [1, 2, 3]]):
            with self.assertRaises(ValueError):
                m.validate_vectors({'embeddings': vectors}, 1, 3)

    def test_invalid_vector_values_are_rejected(self):
        for value in (float('nan'), float('inf'), True, '0.1'):
            with self.assertRaises(ValueError):
                m.validate_vectors({'embeddings': [[0.2, value]]}, 1, 2)
        with self.assertRaises(ValueError):
            m.validate_vectors({'embeddings': [[0, 0]]}, 1, 2)

    def test_exact_model_tag_is_required(self):
        models = [{'name': 'example:large'}, {'name': 'example:latest'}]
        self.assertIsNone(m.find_model(models, 'example:small'))
        self.assertEqual(m.find_model(models, 'example'), models[1])

    def test_preview_cannot_load_a_model_or_probe_an_endpoint(self):
        c = {'embedding': {'endpoint': 'http://127.0.0.1:11434', 'model': 'fixture', 'dimensions': 3}}
        with patch.object(m, 'request', side_effect=AssertionError('network in preview')):
            self.assertEqual(m.benchmark(c, ['representative input'])['status'], 'planned')

    def test_model_changed_mid_measurement_fails_closed(self):
        c = {'embedding': {'endpoint': 'http://127.0.0.1:11434', 'model': 'fixture', 'dimensions': 2}}
        before = {'selectedModel': {'digest': 'before'}, 'loadedModel': None}
        after = {'selectedModel': {'digest': 'after'}, 'loadedModel': None}
        with patch.object(m, 'inventory', side_effect=[before, after]), patch.object(m, 'request', return_value={'embeddings': [[0.2, 0.8]]}):
            with self.assertRaisesRegex(ValueError, 'identity changed'):
                m.benchmark(c, ['representative input'], True)
