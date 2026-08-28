#!/bin/bash
PATH=$PATH:$LAMBDA_TASK_ROOT/bin \
    PYTHONPATH=$PYTHONPATH:$LAMBDA_RUNTIME_DIR \
    exec python -m uvicorn --factory portfolio_api.app:create_app \
    --host 0.0.0.0 --port "${AWS_LWA_PORT:-8000}"
