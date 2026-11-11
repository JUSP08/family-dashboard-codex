"""Entry point invoked by the Hermes scheduler using the dashboard Python."""
import json,os,sys
from pathlib import Path
root=Path('/home/sire/family-dashboard-codex/backend')
os.chdir(root);sys.path.insert(0,str(root))
from services.hermes_school_service import run,HOME,private_save,mail,LOCAL
from datetime import datetime,timedelta
import time
try:
    result=run(apply='--preview' not in sys.argv)
    (HOME/'hermes-error.json').unlink(missing_ok=True)
    print(json.dumps({k:result[k] for k in ('mode','messages_checked','interpreted','backlog','rejected','changes','review')}))
except Exception as exc:
    # Never reflect raw provider responses or credentials into cron logs.
    private_save(HOME/'hermes-error.json',{'error':type(exc).__name__,'checked_at':time.time()})
    now=datetime.now(LOCAL);day=now.date()+timedelta(days=1 if now.hour>=12 else 0)
    while day.weekday()>=5:day+=timedelta(days=1)
    mail.save({'date':day.isoformat(),'checked_at':time.time(),'items':[],
        'processing':'hermes-openrouter','warning':'Hermes could not refresh school emails. Check your inbox.'})
    print('Hermes school-email job failed: '+type(exc).__name__)
    sys.exit(1)
