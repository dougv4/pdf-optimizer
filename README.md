# PDF Optimizer Streamlit App

Web app em Streamlit para otimizar PDF com:
- compressao via Ghostscript
- linearizacao via qpdf

Arquivo principal: `streamlit_app.py`

## Rodar localmente

```bash
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements-streamlit.txt
streamlit run streamlit_app.py
```

## Publicar no Streamlit Community Cloud

1. Suba este projeto para um repositorio **publico** no GitHub.
2. Acesse: https://share.streamlit.io/
3. Clique em **New app** e selecione:
   - Repository: seu repo
   - Branch: `main`
   - Main file path: `streamlit_app.py`
4. Clique em **Deploy**.

## Requisitos de sistema

O app usa binarios de sistema:
- `gs` (Ghostscript)
- `qpdf`

No Streamlit Community Cloud, esses pacotes sao instalados via `packages.txt`
na raiz do repositorio.
