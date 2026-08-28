LOCAL_AWS := AWS_ACCESS_KEY_ID=dummy \
             AWS_SECRET_ACCESS_KEY=dummy \
             AWS_DEFAULT_REGION=us-west-1

build-ApiFunction:
	uv export --frozen --no-dev --no-emit-project --no-hashes \
		-o $(ARTIFACTS_DIR)/requirements.txt
	uv pip install \
		-r $(ARTIFACTS_DIR)/requirements.txt \
		--target $(ARTIFACTS_DIR) \
		--python-platform aarch64-unknown-linux-gnu \
		--python-version 3.13 \
		--only-binary :all: \
		--quiet
	rm $(ARTIFACTS_DIR)/requirements.txt
	cp -r src/portfolio_api $(ARTIFACTS_DIR)/portfolio_api
	cp run.sh $(ARTIFACTS_DIR)/run.sh
	chmod 755 $(ARTIFACTS_DIR)/run.sh
	rm -rf $(ARTIFACTS_DIR)/boto3 $(ARTIFACTS_DIR)/botocore
	rm -rf $(ARTIFACTS_DIR)/boto3-*.dist-info $(ARTIFACTS_DIR)/botocore-*.dist-info

validate:
	$(LOCAL_AWS) sam validate --lint

test:
	uv run pytest -q
	uv run ruff check .
	uv run ruff format --check .

serve:
	uv run serve

stream:
	curl -N -X POST http://localhost:8000/chat \
		-H 'content-type: application/json' \
		-d '{"message":"What did you build at Tax Relief Advocates?"}'

buffering:
	curl -sN -o /dev/null -X POST http://localhost:8000/chat \
		-H 'content-type: application/json' \
		-d '{"message":"What did you build at Tax Relief Advocates?"}' \
		-w 'first_byte=%{time_starttransfer}s total=%{time_total}s\n'

.PHONY: build-ApiFunction validate test serve stream buffering
