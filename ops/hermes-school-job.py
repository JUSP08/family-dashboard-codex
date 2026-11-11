"""Entry point invoked by the Hermes scheduler using the dashboard Python."""
import json,os,sys
from pathlib import Path
root=Path('/home/sire/family-dashboard-codex/backend')
os.chdir(root);sys.path.insert(0,str(root))
from services.hermes_school_service import run,HOME,private_save
try:
    result=run(apply='--preview' not in sys.argv)
    print(json.dumps({k:result[k] for k in ('mode','messages_checked','interpreted','backlog','rejected','changes','review')}))
except Exception as exc:
    # Never reflect raw provider responses or credentials into cron logs.
    private_save(HOME/'hermes-error.json',{'error':type(exc).__name__})
    print('Hermes school-email job failed: '+type(exc).__name__)
    sys.exit(1)
