from .auth import api_auth_bp
from .boards import api_boards_bp
from .dashboard import api_dashboard_bp
from .notifications import api_notifications_bp
from .social import api_social_bp
from .tasks import api_tasks_bp


API_BLUEPRINTS = [
    api_auth_bp,
    api_dashboard_bp,
    api_social_bp,
    api_boards_bp,
    api_tasks_bp,
    api_notifications_bp,
]
