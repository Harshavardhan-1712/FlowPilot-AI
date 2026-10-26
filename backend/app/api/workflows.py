from typing import List, Tuple, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.user import User
from app.models.workspace import Workspace
from app.models.workflow import Workflow, WorkflowVersion
from app.models.execution import WorkflowExecution
from app.schemas.workflow import (
    WorkflowCreate,
    WorkflowUpdate,
    WorkflowResponse,
    WorkflowDetailResponse,
    WorkflowDefinition,
    WorkflowValidationResult,
    WorkflowGenerateRequest,
    WorkflowGenerateResponse,
)
from app.schemas.execution import ExecutionResponse, ExecutionTriggerRequest
from app.api.deps import get_current_user, get_current_workspace
from app.services.workflow_validator import validate_workflow_graph
from app.services.workflow_executor import WorkflowExecutionEngine
from app.providers import get_llm_provider

router = APIRouter(prefix="/workflows", tags=["Workflows"])


@router.get("", response_model=List[WorkflowResponse])
def list_workflows(
    ws_role: Tuple[Workspace, str] = Depends(get_current_workspace),
    db: Session = Depends(get_db)
):
    ws, _ = ws_role
    workflows = db.query(Workflow).filter(
        Workflow.workspace_id == ws.id
    ).order_by(Workflow.updated_at.desc()).all()
    return workflows


@router.post("", response_model=WorkflowDetailResponse, status_code=status.HTTP_201_CREATED)
def create_workflow(
    req: WorkflowCreate,
    ws_role: Tuple[Workspace, str] = Depends(get_current_workspace),
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    ws, _ = ws_role

    default_def = req.definition or WorkflowDefinition(
        nodes=[
            {
                "id": "node-1",
                "type": "manualTrigger",
                "position": {"x": 100, "y": 150},
                "data": {"label": "Manual Trigger"}
            }
        ],
        edges=[]
    )

    wf = Workflow(
        workspace_id=ws.id,
        name=req.name,
        description=req.description,
        status="draft",
        current_version=1,
        created_by_id=user.id
    )
    db.add(wf)
    db.flush()

    ver = WorkflowVersion(
        workflow_id=wf.id,
        version_number=1,
        definition=default_def.model_dump(),
        changelog="Initial workflow version",
        created_by_id=user.id
    )
    db.add(ver)
    db.commit()
    db.refresh(wf)

    return WorkflowDetailResponse(
        id=wf.id,
        workspace_id=wf.workspace_id,
        name=wf.name,
        description=wf.description,
        status=wf.status,
        current_version=wf.current_version,
        created_at=wf.created_at,
        updated_at=wf.updated_at,
        definition=default_def,
        total_executions=0
    )


@router.get("/{workflow_id}", response_model=WorkflowDetailResponse)
def get_workflow(
    workflow_id: str,
    ws_role: Tuple[Workspace, str] = Depends(get_current_workspace),
    db: Session = Depends(get_db)
):
    ws, _ = ws_role
    wf = db.query(Workflow).filter(
        Workflow.id == workflow_id,
        Workflow.workspace_id == ws.id
    ).first()

    if not wf:
        raise HTTPException(status_code=404, detail="Workflow not found")

    latest_ver = db.query(WorkflowVersion).filter(
        WorkflowVersion.workflow_id == wf.id,
        WorkflowVersion.version_number == wf.current_version
    ).first()

    def_data = latest_ver.definition if latest_ver else {"nodes": [], "edges": []}
    exec_count = db.query(WorkflowExecution).filter(WorkflowExecution.workflow_id == wf.id).count()
    last_exec = db.query(WorkflowExecution).filter(
        WorkflowExecution.workflow_id == wf.id
    ).order_by(WorkflowExecution.created_at.desc()).first()

    return WorkflowDetailResponse(
        id=wf.id,
        workspace_id=wf.workspace_id,
        name=wf.name,
        description=wf.description,
        status=wf.status,
        current_version=wf.current_version,
        created_at=wf.created_at,
        updated_at=wf.updated_at,
        definition=WorkflowDefinition(**def_data),
        total_executions=exec_count,
        last_execution_status=last_exec.status if last_exec else None,
        last_execution_at=last_exec.created_at if last_exec else None
    )


@router.put("/{workflow_id}", response_model=WorkflowDetailResponse)
def update_workflow(
    workflow_id: str,
    req: WorkflowUpdate,
    ws_role: Tuple[Workspace, str] = Depends(get_current_workspace),
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    ws, _ = ws_role
    wf = db.query(Workflow).filter(
        Workflow.id == workflow_id,
        Workflow.workspace_id == ws.id
    ).first()

    if not wf:
        raise HTTPException(status_code=404, detail="Workflow not found")

    if req.name is not None:
        wf.name = req.name
    if req.description is not None:
        wf.description = req.description
    if req.status is not None:
        wf.status = req.status

    if req.definition is not None:
        # Validate graph
        validation = validate_workflow_graph(req.definition)
        if not validation.is_valid:
            error_msgs = [i.message for i in validation.issues if i.type == "error"]
            raise HTTPException(
                status_code=400,
                detail=f"Workflow definition validation failed: {'; '.join(error_msgs)}"
            )

        new_version_num = wf.current_version + 1
        new_ver = WorkflowVersion(
            workflow_id=wf.id,
            version_number=new_version_num,
            definition=req.definition.model_dump(),
            changelog=req.changelog or f"Updated to version {new_version_num}",
            created_by_id=user.id
        )
        db.add(new_ver)
        wf.current_version = new_version_num

    db.commit()
    db.refresh(wf)

    latest_ver = db.query(WorkflowVersion).filter(
        WorkflowVersion.workflow_id == wf.id,
        WorkflowVersion.version_number == wf.current_version
    ).first()

    return WorkflowDetailResponse(
        id=wf.id,
        workspace_id=wf.workspace_id,
        name=wf.name,
        description=wf.description,
        status=wf.status,
        current_version=wf.current_version,
        created_at=wf.created_at,
        updated_at=wf.updated_at,
        definition=WorkflowDefinition(**latest_ver.definition),
        total_executions=db.query(WorkflowExecution).filter(WorkflowExecution.workflow_id == wf.id).count()
    )


@router.delete("/{workflow_id}", status_code=status.HTTP_200_OK)
def delete_workflow(
    workflow_id: str,
    ws_role: Tuple[Workspace, str] = Depends(get_current_workspace),
    db: Session = Depends(get_db)
):
    ws, _ = ws_role
    wf = db.query(Workflow).filter(
        Workflow.id == workflow_id,
        Workflow.workspace_id == ws.id
    ).first()
    if not wf:
        raise HTTPException(status_code=404, detail="Workflow not found")

    db.delete(wf)
    db.commit()
    return {"message": "Workflow deleted successfully"}


@router.post("/validate", response_model=WorkflowValidationResult)
def validate_definition(req: WorkflowDefinition):
    return validate_workflow_graph(req)


@router.post("/generate-plan", response_model=WorkflowGenerateResponse)
def generate_ai_workflow(
    req: WorkflowGenerateRequest,
    ws_role: Tuple[Workspace, str] = Depends(get_current_workspace)
):
    provider = get_llm_provider()
    response = provider.generate_structured(req.prompt, WorkflowGenerateResponse)
    
    # Run validator on generated workflow
    val_res = validate_workflow_graph(response.definition)
    response.is_valid = val_res.is_valid
    response.validation_issues = val_res.issues
    return response


@router.post("/{workflow_id}/execute", response_model=ExecutionResponse, status_code=status.HTTP_201_CREATED)
def trigger_workflow_execution(
    workflow_id: str,
    req: ExecutionTriggerRequest,
    ws_role: Tuple[Workspace, str] = Depends(get_current_workspace),
    db: Session = Depends(get_db)
):
    ws, _ = ws_role
    wf = db.query(Workflow).filter(
        Workflow.id == workflow_id,
        Workflow.workspace_id == ws.id
    ).first()

    if not wf:
        raise HTTPException(status_code=404, detail="Workflow not found")

    version = db.query(WorkflowVersion).filter(
        WorkflowVersion.workflow_id == wf.id,
        WorkflowVersion.version_number == wf.current_version
    ).first()

    if not version:
        raise HTTPException(status_code=400, detail="Workflow has no valid version definition to execute.")

    # Validate definition before running
    wf_def = WorkflowDefinition(**version.definition)
    val_result = validate_workflow_graph(wf_def)
    if not val_result.is_valid:
        error_msgs = [i.message for i in val_result.issues if i.type == "error"]
        raise HTTPException(
            status_code=400,
            detail=f"Cannot execute invalid workflow: {'; '.join(error_msgs)}"
        )

    # Create Execution
    execution = WorkflowExecution(
        workspace_id=ws.id,
        workflow_id=wf.id,
        workflow_version_id=version.id,
        status="pending",
        trigger_type="manual",
        trigger_data=req.trigger_data
    )
    db.add(execution)
    db.commit()
    db.refresh(execution)

    # Run engine
    engine = WorkflowExecutionEngine(db=db, execution_id=execution.id)
    engine.run()
    db.refresh(execution)

    return execution
