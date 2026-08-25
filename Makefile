# Alvos de verificação do PhyloTreeMiner.
# PY aponta para o ambiente conda do projeto; sobrescreva se o seu difere.
PY ?= python
FRONT := Frontend/phylotreeminer

.PHONY: help test test-backend test-frontend lint build golden oracle security \
        reference-check reference-check-full reference-dataset taxonomy-audit \
        baseline snapshots-update check

help:
	@grep -E '^[a-z-]+:.*?## .*$$' $(MAKEFILE_LIST) | \
	  awk 'BEGIN{FS=":.*?## "}{printf "  \033[36m%-18s\033[0m %s\n", $$1, $$2}'

check: lint test build ## Tudo que a CI roda

test: test-backend test-frontend ## Testes dos dois lados

test-backend: ## pytest do backend
	cd Backend && $(PY) -m pytest tests

test-frontend: ## vitest do frontend
	npm --prefix $(FRONT) run test -- --run

lint: ## catraca de lint — falha se o débito crescer
	npm --prefix $(FRONT) run lint:ratchet

build: ## build de produção do frontend
	npm --prefix $(FRONT) run build

golden: ## só os golden snapshots
	cd Backend && $(PY) -m pytest tests/golden -m golden

security: ## só a bateria de segurança
	cd Backend && $(PY) -m pytest tests -m security

oracle: ## confronto contra dendropy/ete3
	cd Backend && $(PY) -m pytest tests/oracle -m oracle

snapshots-update: ## regrava os golden snapshots (exige parecer no ledger)
	cd Backend && UPDATE_SNAPSHOTS=1 $(PY) -m pytest tests/golden

baseline: ## reproduz as tabelas de Variola pelo oráculo de auditoria
	cd BioComp_UFF && $(PY) ../docs/science/scripts/audit_variola.py

reference-check: ## PORTÃO CIENTÍFICO — invariante de Li et al. (2007), sobre as árvores versionadas
	@cd BioComp_UFF && $(PY) ../docs/science/scripts/reference_check.py; \
	  codigo=$$?; \
	  if [ $$codigo -eq 1 ]; then exit 1; fi; \
	  exit 0

reference-check-full: ## PORTÃO CIENTÍFICO completo — reexecuta o pipeline. Máquina de validação.
	@echo "Reexecuta o pipeline sobre o dataset de referência e confere o invariante."
	@echo "Exige a máquina de validação: ver docs/automation/11-handoff-maquina-de-validacao.md"
	@echo ""
	@echo "  1. reexecutar VARV-49 com mode=advanced e a biblioteca completa"
	@echo "  2. cd BioComp_UFF && $(PY) ../docs/science/scripts/reference_check.py \\"
	@echo "       --trees projects/<projeto-reexecutado>/out/Trees"
	@echo ""
	@echo "Antes: resolver a divergência de versão (FastTree 2.2.0 vs 2.1.11)."
	@exit 1

reference-dataset: ## regenera Backend/tests/data/reference/ a partir do VARV-49
	cd BioComp_UFF && $(PY) ../docs/science/scripts/gerar_dataset_referencia.py

taxonomy-audit: ## confere a linhagem dos conjuntos contra o clado declarado (D6)
	cd BioComp_UFF && $(PY) ../docs/science/scripts/auditar_taxonomia.py
