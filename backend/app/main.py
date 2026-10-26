from contextlib import asynccontextmanager
from fastapi import FastAPI, status
from fastapi.middleware.cors import CORSMiddleware

from app.config import settings
from app.database import init_db, SessionLocal
from app.seed import seed_database
from app.api.auth import router as auth_router
from app.api.workspaces import router as workspaces_router
from app.api.workflows import router as workflows_router
from app.api.executions import router as executions_router
from app.api.approvals import router as approvals_router
from app.api.knowledge import router as knowledge_router
from app.api.analytics import router as analytics_router


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: ensure tables exist and seed demo data
    init_db()
    db = SessionLocal()
    try:
        seed_database(db)
    finally:
        db.close()
    yield
    # Shutdown logic if any


app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.VERSION,
    description="Enterprise Agentic Workflow Automation Platform",
    lifespan=lifespan,
    docs_url="/docs",
    redoc_url="/redoc"
)

# CORS Middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allows frontend dev & prod
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Health & Readiness Checks
@app.get("/healthz", status_code=status.HTTP_200_OK, tags=["System"])
def health_check():
    return {
        "status": "healthy",
        "service": settings.PROJECT_NAME,
        "version": settings.VERSION,
        "environment": settings.ENVIRONMENT,
        "database": "sqlite" if settings.is_sqlite else "postgresql",
        "llm_provider": settings.LLM_PROVIDER
    }


@app.get("/readyz", status_code=status.HTTP_200_OK, tags=["System"])
def readiness_check():
    # Verify DB connectivity
    db = SessionLocal()
    try:
        from sqlalchemy import text
        db.execute(text("SELECT 1"))
        return {"status": "ready"}
    finally:
        db.close()


# Mount API V1 Routers
prefix = settings.API_V1_PREFIX
app.include_router(auth_router, prefix=prefix)
app.include_router(workspaces_router, prefix=prefix)
app.include_router(workflows_router, prefix=prefix)
app.include_router(executions_router, prefix=prefix)
app.include_router(approvals_router, prefix=prefix)
app.include_router(knowledge_router, prefix=prefix)
app.include_router(analytics_router, prefix=prefix)


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app.main:app", host="0.0.0.0", port=8000, reload=True)
