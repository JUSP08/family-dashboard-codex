"""Read-only preview using existing sources; no speech or scheduler invocation."""
import sys,os,tempfile,json
from pathlib import Path
live=Path('/home/sire/family-dashboard-codex/backend')
sys.path.insert(0,str(live));os.chdir(live)
import config
stage=Path(__file__).resolve().parents[1]
sys.path.insert(0,str(stage/'backend'))
from services import morning_briefing_service as m
m.PROJECT_ROOT=stage
with tempfile.TemporaryDirectory() as temp:
    m.DB_PATH=Path(temp)/'preview.db'
    assert m.ENABLED is False,'Scheduled playback must remain disabled'
    print(json.dumps(m.get_briefing(force=True),indent=2))
