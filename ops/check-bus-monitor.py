"""One read-only live poll using existing dashboard credentials and a temporary database."""
import sys, tempfile, json
from pathlib import Path
sys.path.insert(0,'/home/sire/family-dashboard-codex/backend')
import config
sys.path.insert(0,str(Path(__file__).resolve().parents[1]/'backend'))
import services.bus_alert_service as bus
with tempfile.TemporaryDirectory() as temp:
    bus.DB_PATH=Path(temp)/'bus.db'
    observer=bus.Observer()
    observer.ws=bus.websocket.create_connection(config.settings.ha_url.replace('http','ws',1)+'/api/websocket',timeout=15)
    observer.ws.recv()
    observer.ws.send(json.dumps({'type':'auth','access_token':config.settings.ha_token}))
    assert json.loads(observer.ws.recv())['type']=='auth_ok'
    observer.poll()
    print(json.dumps(bus.get_bus_status(),indent=2))
    observer.ws.close()
