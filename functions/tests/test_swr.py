# Mocking hell to avoid importing real google/firebase libs in unit tests
import sys
import os
import pytest
import datetime
from unittest.mock import MagicMock

# Create a mock for google.cloud package
mock_google = MagicMock()
mock_cloud = MagicMock()
mock_google.cloud = mock_cloud

# Mock specific submodules that main.py imports
mock_cloud.pubsub_v1 = MagicMock()
mock_cloud.firestore = MagicMock()
mock_cloud.functions = MagicMock() # This was the missing one causing error

sys.modules["google"] = mock_google
sys.modules["google.cloud"] = mock_cloud
sys.modules["google.cloud.pubsub_v1"] = mock_cloud.pubsub_v1

# Mock firebase_admin
mock_firebase = MagicMock()
sys.modules["firebase_admin"] = mock_firebase
sys.modules["firebase_admin.firestore"] = MagicMock()

# Mock firebase_functions
mock_functions = MagicMock()
sys.modules["firebase_functions"] = mock_functions

# Import the function to test
# We need to add the functions directory to sys.path
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))
from main import is_cache_stale

class TestStaleCheck:
    def test_no_events_is_stale(self):
        assert is_cache_stale([]) is True
        assert is_cache_stale(None) is True

    def test_missing_fetched_at_is_stale(self):
        events = [{"title": "Event 1"}]
        assert is_cache_stale(events) is True

    def test_fresh_data_is_not_stale(self):
        now = datetime.datetime.now(datetime.timezone.utc)
        fresh_event = {
            "title": "Event 1",
            "fetchedAt": now - datetime.timedelta(hours=2)
        }
        assert is_cache_stale([fresh_event]) is False

    def test_stale_data_is_stale(self):
        now = datetime.datetime.now(datetime.timezone.utc)
        stale_event = {
            "title": "Event 1",
            "fetchedAt": now - datetime.timedelta(hours=25)
        }
        assert is_cache_stale([stale_event]) is True

    def test_string_timestamp_fresh(self):
        now = datetime.datetime.now(datetime.timezone.utc)
        fresh_time_str = (now - datetime.timedelta(hours=5)).isoformat()
        
        event = {
            "title": "Event 1",
            "fetchedAt": fresh_time_str
        }
        assert is_cache_stale([event]) is False

    def test_string_timestamp_stale(self):
        now = datetime.datetime.now(datetime.timezone.utc)
        stale_time_str = (now - datetime.timedelta(hours=48)).isoformat()
        
        event = {
            "title": "Event 1",
            "fetchedAt": stale_time_str
        }
        assert is_cache_stale([event]) is True
