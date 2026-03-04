# Streamlit App: PDF Optimizer

## Objetivo
Interface web (Streamlit) para:
- receber um PDF via upload
- comprimir com Ghostscript
- linearizar com qpdf
- permitir download do arquivo final

Bookmarks foram removidos deste fluxo por solicitacao.

## Arquivos
- `streamlit_app.py`: aplicacao Streamlit
- `requirements-streamlit.txt`: dependencia Python

## Dependencias de sistema
Necessario ter estes binarios disponiveis no `PATH`:
- `gs` (Ghostscript)
- `qpdf`

## Rodar localmente
No diretorio do projeto:

```bash
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements-streamlit.txt
streamlit run streamlit_app.py
```

## Fluxo interno
1. Salva upload em diretorio temporario.
2. Executa Ghostscript com perfil equilibrado RGB:
   - downsample color/gray
   - JPEG quality configuravel
   - deduplicacao de imagens
3. Lineariza output com `qpdf --linearize`.
4. Executa `qpdf --check`.
5. Mostra metricas de reducao e disponibiliza download.

## Parametros na UI
- `Color DPI` (padrao: 150)
- `Gray DPI` (padrao: 150)
- `JPEG quality` (padrao: 80)

## Observacoes
- O processamento usa arquivos temporarios e nao altera arquivos do repositorio.
- Se `gs` ou `qpdf` estiverem ausentes, o app indica erro na sidebar.
