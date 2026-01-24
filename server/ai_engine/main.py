import sys
# Print specific start token to stderr for debugging
print("DEBUG: PYTHON STARTING", file=sys.stderr)
import json
import os
import traceback
from omnidimension import Client
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Initialize Client
api_key = os.getenv("OMNIDIM_API_KEY")
if not api_key:
    print(json.dumps({"status": "error", "message": "Missing OMNIDIM_API_KEY"}))
    sys.exit(1)

client = Client(api_key=api_key)

def dispatch_call(phone_number, custom_script, language):
    try:
        # 1. Setup IDs
        agent_id = int(os.getenv("OMNIDIM_AGENT_ID"))
        from_number_id = int(os.getenv("OMNIDIM_NUMBER_ID"))

        # 2. Dispatch Call
        response = client.call.dispatch_call(
            agent_id=agent_id,
            to_number=phone_number,
            from_number_id=from_number_id, 
            call_context={
                "call_script": custom_script,
                "language": language
            }
        )
        
        # 3. Flexible ID Extraction (Accepts RequestID OR CallID)
        c_id = None
        data = response
        if hasattr(response, 'to_dict'): data = response.to_dict()
        elif hasattr(response, '__dict__'): data = response.__dict__

        if isinstance(data, dict):
            # Try standard fields
            c_id = data.get('call_id') or data.get('id') or data.get('uuid')
            
            # Try nested json/data fields
            if not c_id and 'json' in data:
                c_id = data['json'].get('call_id') or data['json'].get('requestId')
            if not c_id and 'data' in data:
                c_id = data['data'].get('call_id') or data['data'].get('requestId')

        # Fallback
        if not c_id:
            c_id = "queued_call_no_id"

        # 4. Return SUCCESS
        print(json.dumps({
            "status": "success", 
            "call_id": c_id, 
            "message": "Call initiated successfully"
        }))
        
    except Exception as e:
        print(json.dumps({"status": "error", "message": str(e)}))

def get_call_log(ignored_call_id):
    try:
        # STEP 1: Fetch the list to find the REAL ID
        # (The ID you have in frontend might be a Request ID, so we get the latest actual call)
        logs_response = client.call.get_call_logs()
        
        # Handle Response Format
        data = logs_response
        if hasattr(logs_response, 'to_dict'): data = logs_response.to_dict()
        if 'json' in data: data = data['json']
        
        # Get the list
        call_list = data.get('call_log_data', []) or data.get('data', []) or data.get('calls', [])
        
        if not call_list or len(call_list) == 0:
            print(json.dumps({
                "status": "success", 
                "transcript": "No calls found in history yet.",
                "call_status": "empty"
            }))
            return

        # Get the most recent call summary
        latest_summary = call_list[0]
        
        # Extract the REAL Call ID from summary
        real_call_id = latest_summary.get('call_id') or latest_summary.get('id') or latest_summary.get('uuid')
        
        if not real_call_id:
             print(json.dumps({"status": "error", "message": "Could not find Call ID in history summary"}))
             return

        # STEP 2: Use the Real ID to fetch FULL DETAILS
        # This 2nd call is required because the list view often hides the transcript
        try:
            # Cast to int if possible, as some SDKs require it
            real_call_id_val = int(real_call_id)
        except:
            real_call_id_val = real_call_id

        full_details_response = client.call.get_call_log(real_call_id_val)
        
        # Unwrap the full details
        details = full_details_response
        if hasattr(full_details_response, 'to_dict'): details = full_details_response.to_dict()
        if 'json' in details: details = details['json']
        if 'data' in details: details = details['data']

        # STEP 3: Extract Transcript
        transcript = details.get('transcript') or details.get('text')
        
        # Handle list-based transcripts (common in AI)
        if not transcript:
            msgs = details.get('messages') or details.get('conversation')
            if msgs and isinstance(msgs, list):
                lines = []
                for m in msgs:
                    if isinstance(m, dict):
                        role = m.get('role', 'User')
                        content = m.get('content') or m.get('text') or ''
                        lines.append(f"{role}: {content}")
                    else:
                        lines.append(str(m))
                transcript = "\n".join(lines)
        
        if not transcript:
            transcript = "Transcript processing..."

        print(json.dumps({
            "status": "success",
            "transcript": transcript,
            "recording_url": details.get('recording_url'),
            "call_status": details.get('status'),
            "fetched_id": real_call_id
        }))
        
    except Exception as e:
        # Include traceback for easier debugging
        print(json.dumps({"status": "error", "message": str(e), "traceback": traceback.format_exc()}))

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print(json.dumps({"status": "error", "message": "Missing command"}))
        sys.exit(1)

    command = sys.argv[1]

    if command == "call" and len(sys.argv) > 4:
        dispatch_call(sys.argv[2], sys.argv[3], sys.argv[4])
    elif command == "status":
        get_call_log("ignored") 
    else:
        print(json.dumps({"status": "error", "message": "Invalid arguments"}))