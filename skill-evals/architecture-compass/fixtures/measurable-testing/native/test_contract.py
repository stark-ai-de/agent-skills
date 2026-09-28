import unittest
def parse_record(value):
    if not isinstance(value, dict) or not isinstance(value.get("name"), str) or not value["name"].strip() or type(value.get("version")) is not int or value["version"] < 1:
        raise ValueError("invalid record")
    return value
class Contract(unittest.TestCase):
    def test_valid_record(self):
        self.assertEqual(parse_record({"name":"native", "version":1})["version"], 1)
    def test_invalid_record(self):
        for value in [None, {}, {"name":"native", "version":0}]:
            with self.assertRaises(ValueError): parse_record(value)
