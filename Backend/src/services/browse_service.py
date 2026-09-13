"""Listagem de diretórios de dados/projetos (Arq-B/M5).

Movido de `app.py` — cópia literal da lógica de `/dataFolders`, `/browse`,
`/inputs_data` e `/uploaded-data`. Serviço não conhece FastAPI: recebe
caminhos já resolvidos/validados pelo router (que decide 403/404), devolve
listas de `Project`/`FileSystemItem`.

`listar_inputs_data` preserva um bug real, não corrigido nesta fatia (é
refatoração pura, regra 4/6 do CLAUDE.md): ignora o parâmetro `path` da rota
original e sempre lista `PATH_BASE_WORKFLOW/data`; e calcula `path` relativo a
`projects_root` mesmo quando o item está sob `data_root` (diretórios irmãos,
não um dentro do outro). Registrado para a fila de triagem.
"""
import datetime
import glob
import os
from typing import List

from src.schemas import FileSystemItem, Project


def listar_pastas_de_dados(data_root: str) -> List[Project]:
    """Lista os diretórios de dados disponíveis (`/dataFolders`)."""
    data_folders = []
    for data_folder in sorted(os.listdir(data_root)):
        full_path = os.path.join(data_root, data_folder)
        if os.path.isdir(full_path):
            data_folders.append(Project(
                name=data_folder,
                last_modified=datetime.datetime.fromtimestamp(os.path.getmtime(full_path))
            ))
    return data_folders


def listar_itens_do_diretorio(requested_path: str, projects_root: str) -> List[FileSystemItem]:
    """Explora o conteúdo de um diretório dentro da pasta de projetos (`/browse`).

    `requested_path` já chega resolvido e validado (`resolve_within`) pelo
    router; aqui só se lista."""
    items = []
    for item_name in sorted(os.listdir(requested_path)):
        full_item_path = os.path.join(requested_path, item_name)
        relative_item_path = os.path.relpath(full_item_path, projects_root)

        item_type = "directory" if os.path.isdir(full_item_path) else "file"

        items.append(FileSystemItem(
            name=item_name,
            path=relative_item_path.replace("\\", "/"),
            type=item_type,
            size=os.path.getsize(full_item_path),
            last_modified=datetime.datetime.fromtimestamp(os.path.getmtime(full_item_path))
        ))
    return items


def listar_inputs_data(path_base_workflow: str, projects_root: str) -> List[FileSystemItem]:
    """Lógica de `/inputs_data` — cópia literal, bug incluso (ver docstring do
    módulo): ignora `path`, sempre lista `path_base_workflow/data`."""
    requested_path = os.path.abspath(os.path.join(path_base_workflow, 'data'))

    items = []
    for item_name in sorted(os.listdir(requested_path)):
        full_item_path = os.path.join(requested_path, item_name)
        relative_item_path = os.path.relpath(full_item_path, projects_root)

        item_type = "directory" if os.path.isdir(full_item_path) else "file"

        items.append(FileSystemItem(
            name=item_name,
            path=relative_item_path.replace("\\", "/"),
            type=item_type,
            size=os.path.getsize(full_item_path),
            last_modified=datetime.datetime.fromtimestamp(os.path.getmtime(full_item_path))
        ))
    return items


def inputs_data_existe(path_base_workflow: str) -> bool:
    """Checagem de existência que `/inputs_data` faz antes de listar."""
    requested_path = os.path.abspath(os.path.join(path_base_workflow, 'data'))
    return os.path.exists(requested_path) and os.path.isdir(requested_path)


def listar_uploaded_data(data_root: str) -> List[Project]:
    """Lista conjuntos enviados via upload (`/uploaded-data`) — só pastas com
    pelo menos um arquivo (qualquer um: o último `glob.glob(full_path, "*")`
    já pega tudo; os anteriores, específicos de FASTA, são redundantes com
    ele, mas preservados como estavam)."""
    uploaded_folders = []
    for folder_name in sorted(os.listdir(data_root)):
        full_path = os.path.join(data_root, folder_name)
        if os.path.isdir(full_path):
            fasta_files = glob.glob(os.path.join(full_path, "*.fasta")) + \
                         glob.glob(os.path.join(full_path, "*.fa")) + \
                         glob.glob(os.path.join(full_path, "*.fas")) + \
                         glob.glob(os.path.join(full_path, "*")) + \
                         glob.glob(os.path.join(full_path, "*.faa"))

            if fasta_files:
                uploaded_folders.append(Project(
                    name=folder_name,
                    last_modified=datetime.datetime.fromtimestamp(os.path.getmtime(full_path))
                ))

    return uploaded_folders
