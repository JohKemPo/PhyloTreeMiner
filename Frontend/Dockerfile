# syntax=docker/dockerfile:1
#
# Build multi-stage do frontend. Contexto de build: a RAIZ do repo (ver
# docker-compose.yml, build.context) — precisa alcançar tanto
# Frontend/phylotreeminer quanto o nginx.conf, que fica na raiz por ser um
# arquivo do write-lock do contrato A1 compartilhado com o resto da infra.
#
# Estágio 1: instala com pnpm (nunca npm — pnpm-lock.yaml é o lockfile
# versionado, CLAUDE.md "Ambiente") e gera o build de produção do Vite.
FROM node:22.13.1-alpine3.21 AS build

# corepack ativa a versão do pnpm fixada em package.json ("packageManager"),
# em vez de instalar "a última" — a mesma garantia de determinismo que
# pnpm-lock.yaml dá para as dependências.
#
# `npm install -g corepack@latest` (não é dependência do app, é a ferramenta
# de ativação): o corepack empacotado no node:22.13.1 carrega chaves de
# assinatura desatualizadas e falha em "Cannot find matching keyid" após a
# rotação de chaves do registro do npm — só a versão nova do corepack conhece
# a chave atual.
RUN npm install -g corepack@latest && corepack enable

WORKDIR /app

COPY Frontend/phylotreeminer/package.json Frontend/phylotreeminer/pnpm-lock.yaml Frontend/phylotreeminer/pnpm-workspace.yaml ./
RUN corepack prepare --activate $(node -p "require('./package.json').packageManager") \
    && pnpm install --frozen-lockfile

COPY Frontend/phylotreeminer/ .
RUN pnpm run build

# Estágio 2: só o resultado estático, servido por nginx.
FROM nginx:1.27.5-alpine3.21 AS runtime

COPY --from=build /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

HEALTHCHECK --interval=15s --timeout=5s --start-period=10s --retries=5 \
  CMD wget -q --spider http://127.0.0.1:80/ || exit 1

CMD ["nginx", "-g", "daemon off;"]
