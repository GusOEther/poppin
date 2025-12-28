import pytest
from unittest.mock import MagicMock, patch
import json
import sys
import os

# Ensure we can import from the parent directory
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

# Mock the firebase dependencies BEFORE importing main
with patch('firebase_admin.initialize_app'), patch('firebase_admin.firestore.client'):
    import main

@pytest.fixture
def mock_db():
    with patch('main.get_db') as mock:
        yield mock

@pytest.fixture
def mock_genai_client():
    with patch('main.genai.Client') as mock:
        yield mock

def test_get_events_v1_success(mock_db):
    """Test standard event retrieval with mocked Firestore data."""
    # Setup mock request
    req = MagicMock()
    req.args = {"lat": "52.2688", "lng": "10.5268"}
    
    # Setup mock Firestore response
    mock_collection = mock_db.return_value.collection.return_value
    mock_query = mock_collection.where.return_value
    
    # Create valid mock documents
    mock_doc1 = MagicMock()
    mock_doc1.to_dict.return_value = {
        "title": "Jazz Night", 
        "startTime": "2025-12-30T20:00", 
        "city": "Braunschweig"
    }
    
    mock_doc2 = MagicMock()
    mock_doc2.to_dict.return_value = {
        "title": "Basketball", 
        "startTime": "2025-12-29T18:00", 
        "city": "Braunschweig"
    }
    
    # Mock the stream() method to return our docs
    mock_query.stream.return_value = [mock_doc1, mock_doc2]

    # Call the function
    response = main.get_events_v1(req)
    
    # Verify response
    assert response.status_code == 200
    data = json.loads(response.data)
    assert len(data) == 2
    # Verify in-memory sorting (Basketball is earlier than Jazz)
    assert data[0]["title"] == "Basketball"
    assert data[1]["title"] == "Jazz Night"

def test_get_events_v1_missing_params():
    """Test error handling for missing coordinates."""
    req = MagicMock()
    req.args = {} # Empty args
    
    response = main.get_events_v1(req)
    assert response.status == "400 BAD REQUEST" # Werkzeug/Flask response status

def test_process_and_save_events_parsing(mock_db):
    """Test JSON parsing and Firestore saving logic."""
    city_name = "Braunschweig"
    # Sample Gemini response with markdown code block
    raw_response = """
    Here are the events:
    ```json
    [
        {
            "title": "New Year's Eve Party",
            "description": "Party at the castle",
            "category": "Party",
            "startTime": "2025-12-31T22:00",
            "address": "Schlossplatz"
        }
    ]
    ```
    """
    
    # Setup mock batch
    mock_batch = mock_db.return_value.batch.return_value
    
    # Call function
    count = main.process_and_save_events(city_name, raw_response)
    
    # Verify results
    assert count == 1
    
    # Verify batch usage
    mock_db.return_value.collection.assert_called_with("events")
    mock_batch.set.assert_called_once()
    mock_batch.commit.assert_called_once()

def test_fetch_events_via_gemini_calls_correct_model(mock_genai_client):
    """Verify that we are using the working model (gemini-2.5-flash)."""
    # Setup mock
    mock_client_instance = mock_genai_client.return_value
    mock_response = MagicMock()
    mock_response.text = "[]"
    mock_client_instance.models.generate_content.return_value = mock_response
    
    # Call function
    main.fetch_events_via_gemini("Braunschweig")
    
    # Verify the specific model call
    kwargs = mock_client_instance.models.generate_content.call_args.kwargs
    assert kwargs['model'] == "gemini-2.5-flash"
    assert "tools" in kwargs['config'] # Verify search grounding is requested

