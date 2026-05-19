from fastapi import APIRouter
from .weather.agro_weather_router import router as weather_router
from .yield_.agro_yield_router import router as yield_router
from .risk.agro_risk_router import router as risk_router
from .irrigation.agro_irrigation_router import router as irrigation_router
from .disease.agro_disease_router import router as disease_router
from .alerts.agro_alert_router import router as alert_router
from .crops.agro_crop_router import router as crop_router
from .tasks.agro_task_router import router as task_router
from .analytics.agro_analytics_router import router as analytics_router
from .advisor.agro_advisor_router import router as advisor_router

agro_router = APIRouter(prefix="/agro", tags=["AgroSense AI"])
agro_router.include_router(weather_router, prefix="/weather")
agro_router.include_router(yield_router, prefix="/yield")
agro_router.include_router(risk_router, prefix="/risk")
agro_router.include_router(irrigation_router, prefix="/irrigation")
agro_router.include_router(disease_router, prefix="/disease")
agro_router.include_router(alert_router, prefix="/alerts")
agro_router.include_router(crop_router, prefix="/crops")
agro_router.include_router(task_router, prefix="/tasks")
agro_router.include_router(analytics_router, prefix="/analytics")
agro_router.include_router(advisor_router, prefix="/advisor")