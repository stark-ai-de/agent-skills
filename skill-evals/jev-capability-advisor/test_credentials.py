"""Credential-source and bounded-read invariants; all values are synthetic."""
import io
import os
from pathlib import Path
import sys
import tempfile
import unittest
from unittest.mock import patch

sys.dont_write_bytecode = True
from advisor_test_support import SCRIPTS
sys.path.insert(0, str(SCRIPTS))
import jev_advisor


KEY = 'synthetic-typesafe-test-key'


class ReadTrackingStream(io.BytesIO):
    requested_size = None

    def read(self, size=-1):
        self.requested_size = size
        return super().read(size)


class CredentialTests(unittest.TestCase):
    def test_environment_is_used_when_no_file_is_selected(self):
        with patch.dict(os.environ, {'TYPESAFE_API_KEY': KEY}, clear=True):
            self.assertEqual(jev_advisor.load_api_key(), KEY)

    def test_explicit_file_wins_over_environment(self):
        with tempfile.TemporaryDirectory() as directory:
            key_file = Path(directory) / 'key'
            key_file.write_bytes((KEY + '\n').encode('ascii'))
            with patch.dict(os.environ, {'TYPESAFE_API_KEY': 'ambient-test-key'}, clear=True):
                self.assertEqual(jev_advisor.load_api_key(key_file), KEY)

    def test_explicit_file_failure_does_not_fall_back_to_environment(self):
        with tempfile.TemporaryDirectory() as directory, \
                patch.dict(os.environ, {'TYPESAFE_API_KEY': KEY}, clear=True):
            with self.assertRaises(jev_advisor.CredentialError) as caught:
                jev_advisor.load_api_key(Path(directory) / 'missing')
        self.assertEqual(caught.exception.code, 'credential_unavailable')

    def test_missing_environment_has_callsite_specific_error(self):
        with patch.dict(os.environ, {}, clear=True):
            with self.assertRaises(jev_advisor.CredentialError) as caught:
                jev_advisor.load_api_key()
            self.assertEqual(caught.exception.code, 'missing_api_key')
            with self.assertRaises(jev_advisor.CredentialError) as caught:
                jev_advisor.load_api_key(missing_code='credential_unavailable')
            self.assertEqual(caught.exception.code, 'credential_unavailable')

    def test_file_read_is_bounded_and_oversize_is_rejected(self):
        stream = ReadTrackingStream(b'x' * (jev_advisor.MAX_API_KEY_BYTES + 1))
        with patch.object(Path, 'open', autospec=True, return_value=stream) as open_file:
            with self.assertRaises(jev_advisor.CredentialError) as caught:
                jev_advisor.load_api_key(Path('synthetic-key-file'))
        self.assertEqual(caught.exception.code, 'credential_invalid')
        self.assertEqual(stream.requested_size, jev_advisor.MAX_API_KEY_BYTES + 1)
        self.assertEqual(open_file.call_args.args[1], 'rb')

    def test_non_ascii_and_multiline_credentials_are_rejected(self):
        for value in ('bad-é-key', 'first\nsecond', 'x' * (jev_advisor.MAX_API_KEY_BYTES + 1)):
            with self.subTest(value_kind=len(value)), \
                    patch.dict(os.environ, {'TYPESAFE_API_KEY': value}, clear=True):
                with self.assertRaises(jev_advisor.CredentialError) as caught:
                    jev_advisor.load_api_key()
                self.assertEqual(caught.exception.code, 'credential_invalid')

    def test_ascii_control_characters_are_rejected(self):
        for value in ('x\ty', 'x\x7fy'):
            with self.subTest(value_kind=repr(value)), \
                    patch.dict(os.environ, {'TYPESAFE_API_KEY': value}, clear=True):
                with self.assertRaises(jev_advisor.CredentialError) as caught:
                    jev_advisor.load_api_key()
                self.assertEqual(caught.exception.code, 'credential_invalid')

        with tempfile.TemporaryDirectory() as directory:
            key_file = Path(directory) / 'key'
            key_file.write_bytes(b'x\x00y')
            with self.assertRaises(jev_advisor.CredentialError) as caught:
                jev_advisor.load_api_key(key_file)
            self.assertEqual(caught.exception.code, 'credential_invalid')


if __name__ == '__main__':
    unittest.main()
