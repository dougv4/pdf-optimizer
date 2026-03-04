#!/usr/bin/env python3
import argparse
import re
import unicodedata
from pathlib import Path

SECTION_KEYS = {
    "INTRODUCAO",
    "QUE ARTE E ESSA?",
    "MAIS SOBRE A ARTE",
    "QUAL E O PROBLEMA?",
    "TRACANDO A ROTA",
    "PARA INICIO DE CONVERSA",
    "SABERES DA ARTE",
    "RECORTE NA HISTORIA",
    "ENTRE LINGUAGENS",
    "ENTRE SABERES",
    "HORA DE CRIAR",
    "AVALIANDO",
    "TRACANDO O MAPA",
    "EXPERIMENTANDO TECNOLOGIAS",
    "ARTE E PESQUISA",
    "RETOMANDO O APRENDIZADO",
    "INCUBADORA",
    "RESPONDENDO A QUESTAO DA UNIDADE",
    "COMPLETANDO O MAPA",
}

TOP_MISC = {
    "O TRABALHO COM A BNCC",
    "PRODUCOES EM FOCO",
    "NOSSA PROPOSTA",
    "ENEM E VESTIBULARES",
    "TRANSCRICAO DE AUDIOS",
    "REFERENCIAS BIBLIOGRAFICAS COMENTADAS",
}


def normalize(text: str) -> str:
    text = unicodedata.normalize("NFD", text)
    text = "".join(ch for ch in text if unicodedata.category(ch) != "Mn")
    return re.sub(r"\s+", " ", text).strip().upper()


def clean_line(text: str) -> str:
    text = re.sub(r"\.{2,}", " ", text)
    text = re.sub(r"\s+", " ", text)
    return text.strip()


def parse_entries(raw_text: str):
    items = []
    buffer = ""

    for line in raw_text.splitlines():
        line = line.strip()
        if not line:
            continue
        if normalize(line).replace(" ", "") == "SUMARIO":
            continue
        if re.fullmatch(r"\d+", line):
            continue

        unit_label_only = re.fullmatch(
            r"(?i)\s*U\s*N\s*I\s*D\s*A\s*D\s*E\s*\d+\s*", line
        ) is not None
        has_page_number = re.search(r"(\d+)\s*$", line) is not None and not unit_label_only

        if has_page_number:
            merged = clean_line(f"{buffer} {line}" if buffer else line)
            items.append(merged)
            buffer = ""
        else:
            buffer = f"{buffer} {line}".strip() if buffer else line

    entries = []
    for item in items:
        match = re.search(r"(\d+)\s*$", item)
        if not match:
            continue
        title = clean_line(item[: match.start()].strip())
        page = int(match.group(1))
        entries.append((title, page))

    return entries


def build_tree(entries):
    roots = []
    current_unit = None
    current_chapter = None

    def make_node(title, page):
        return {"title": title, "page": page, "children": []}

    for title, page in entries:
        title_norm = normalize(title)

        unit_match = re.search(r"\bU\s*N\s*I\s*D\s*A\s*D\s*E\s*(\d+)\b", title_norm)
        if unit_match:
            number = unit_match.group(1)
            remainder = re.sub(
                r"(?i)U\s*N\s*I\s*D\s*A\s*D\s*E\s*\d+", "", title
            ).strip(" :-")
            unit_title = f"UNIDADE {number}" + (f": {remainder}" if remainder else "")
            unit_node = make_node(unit_title, page)
            roots.append(unit_node)
            current_unit = unit_node
            current_chapter = None
            continue

        if re.match(r"(?i)^CAP[IÍ]TULO\s+\d+", title):
            chapter_node = make_node(title, page)
            if current_unit is None:
                roots.append(chapter_node)
            else:
                current_unit["children"].append(chapter_node)
            current_chapter = chapter_node
            continue

        if title_norm in SECTION_KEYS:
            section_node = make_node(title, page)
            if current_chapter is not None:
                current_chapter["children"].append(section_node)
            elif current_unit is not None:
                current_unit["children"].append(section_node)
            else:
                roots.append(section_node)
            continue

        if title_norm in TOP_MISC:
            roots.append(make_node(title, page))
            current_unit = None
            current_chapter = None

    return roots


def to_utf16_hex(text: str) -> str:
    return "FEFF" + text.encode("utf-16-be").hex().upper()


def write_outputs(tree, ps_path: Path, preview_path: Path):
    with ps_path.open("w", encoding="ascii") as ps_file:
        def emit(node):
            direct_children = len(node["children"])
            line = f"[ /Title <{to_utf16_hex(node['title'])}> /Page {node['page']}"
            if direct_children:
                line += f" /Count {direct_children}"
            line += " /OUT pdfmark\n"
            ps_file.write(line)
            for child in node["children"]:
                emit(child)

        for root in tree:
            emit(root)

    with preview_path.open("w", encoding="utf-8") as preview_file:
        def show(node, level=1):
            preview_file.write(f"{'  ' * (level - 1)}- L{level} p{node['page']} {node['title']}\n")
            for child in node["children"]:
                show(child, level + 1)

        for root in tree:
            show(root)


def main():
    parser = argparse.ArgumentParser(
        description="Generate Ghostscript pdfmark bookmarks (UNIDADE > CAPITULO > SECAO)."
    )
    parser.add_argument("--toc", required=True, help="Path to raw table-of-contents text file")
    parser.add_argument("--out-ps", required=True, help="Output path for generated .ps pdfmark file")
    parser.add_argument(
        "--out-preview", required=True, help="Output path for human-readable tree preview"
    )
    args = parser.parse_args()

    toc_path = Path(args.toc)
    out_ps = Path(args.out_ps)
    out_preview = Path(args.out_preview)

    raw_text = toc_path.read_text(encoding="utf-8")
    entries = parse_entries(raw_text)
    tree = build_tree(entries)

    out_ps.parent.mkdir(parents=True, exist_ok=True)
    out_preview.parent.mkdir(parents=True, exist_ok=True)
    write_outputs(tree, out_ps, out_preview)

    total_nodes = 0
    stack = list(tree)
    while stack:
        node = stack.pop()
        total_nodes += 1
        stack.extend(node["children"])

    print(f"entries={len(entries)}")
    print(f"top_level_nodes={len(tree)}")
    print(f"total_nodes={total_nodes}")
    print(f"out_ps={out_ps}")
    print(f"out_preview={out_preview}")


if __name__ == "__main__":
    main()
