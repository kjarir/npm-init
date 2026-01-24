import sys
import os
try:
    from omnidimension import Client
    from omnidimension.Call import Call
    import inspect

    print("Python Executable:", sys.executable)
    print("Omnidimension file:", inspect.getfile(Client))
    
    # helper to inspect
    print("Call.get_call_logs signature:", inspect.signature(Call.get_call_logs))
    
except Exception as e:
    print("Error:", e)
