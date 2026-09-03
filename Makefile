# Alvos de verificação do PhyloTreeMiner.
# PY aponta para o ambiente conda do projeto; sobrescreva se o seu difere.
PY ?= python
FRONT := Frontend/phylotreeminer
# pnpm: `--dir` é o equivalente ao `--prefix` do npm.
# Vai pelo scripts/pnpm.sh, que garante um Node que o pnpm aceite antes de
# chamá-lo — um `pnpm` no PATH sob Node velho existe e aborta em toda chamada.
PNPM ?= bash scripts/pnpm.sh --dir $(FRONT)

.PHONY: help setup test test-backend test-frontend lint build golden oracle security \
        reference-check reference-check-full reference-dataset taxonomy-audit \
        baseline main-result snapshots-update check

help:
	@grep -E '^[a-z-]+:.*?## .*$$' $(MAKEFILE_LIST) | \
	  awk 'BEGIN{FS=":.*?## "}{printf "  \033[36m%-18s\033[0m %s\n", $$1, $$2}'

setup: ## cria/atualiza o ambiente conda e instala o frontend
	bash scripts/setup_env.sh
	$(PNPM) install

check: lint test build ## Tudo que a CI roda

test: test-backend test-frontend ## Testes dos dois lados

test-backend: ## pytest do backend
	cd Backend && $(PY) -m pytest tests

test-frontend: ## vitest do frontend
	$(PNPM) run test

lint: ## catraca de lint — falha se o débito crescer
	$(PNPM) run lint:ratchet

build: ## build de produção do frontend
	$(PNPM) run build

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

main-result: ## PORTÃO DE M3 — regenera as tabelas cruzadas UFBoot x suporte metodológico
	@cd BioComp_UFF && $(PY) ../docs/science/scripts/resultado_principal.py; \
	  codigo=$$?; \
	  if [ $$codigo -eq 1 ]; then exit 1; fi; \
	  exit 0
# Código 2 (afirmações válidas, reprodução incompleta) não derruba o alvo, pela
# mesma razão de `reference-check`: hoje VARV-52 está bloqueado por falta de
# reexecução, e colapsar "ainda não terminamos" com "quebrou" ensina a ignorar o
# portão. Código 1 — afirmação violada ou oráculo divergente — sempre falha.

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
	@echo "Antes: ative o env do projeto — 'bash scripts/check_dependencies.sh' não pode"
	@echo "acusar nenhuma ferramenta 'fora do env'."
	@exit 1

reference-dataset: ## regenera Backend/tests/data/reference/ a partir do VARV-49
	cd BioComp_UFF && $(PY) ../docs/science/scripts/gerar_dataset_referencia.py

taxonomy-audit: ## confere a linhagem dos conjuntos contra o clado declarado (D6)
	cd BioComp_UFF && $(PY) ../docs/science/scripts/auditar_taxonomia.py
