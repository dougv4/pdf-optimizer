# Processo de compressao, linearizacao e bookmarks (PDF Saraiva)

## Arquivos alvo
- Entrada: `/Users/douglasvianagomes/Downloads/IDENTIDADE_SARAIVA_PNLD26_ARTE_VU_MP.pdf`
- Saida comprimida/linearizada: `/Users/douglasvianagomes/Downloads/IDENTIDADE_SARAIVA_PNLD26_ARTE_VU_MP.optimized-rgb.pdf`
- Saida final com bookmarks: `/Users/douglasvianagomes/Downloads/IDENTIDADE_SARAIVA_PNLD26_ARTE_VU_MP.optimized-rgb.bookmarked.pdf`

## Baseline e checks iniciais
Comandos usados:

```bash
shasum -a 256 "/Users/douglasvianagomes/Downloads/IDENTIDADE_SARAIVA_PNLD26_ARTE_VU_MP.pdf"
qpdf --show-npages "/Users/douglasvianagomes/Downloads/IDENTIDADE_SARAIVA_PNLD26_ARTE_VU_MP.pdf"
qpdf --check "/Users/douglasvianagomes/Downloads/IDENTIDADE_SARAIVA_PNLD26_ARTE_VU_MP.pdf"
```

Resultado observado:
- Tamanho original: `58,410,651 bytes` (`55.70 MB`)
- Paginas: `449`
- SHA256 original: `bdb17df4598630fccbd9a606fd213d5dc0efc71b81365841d16b54ee60e03e11`

## 1) Compressao (perfil equilibrado para distribuicao digital)
Ferramenta usada: `ghostscript` (`gs`) com:
- conversao para RGB
- downsample de imagens para 150 dpi
- JPEG quality 80
- deduplicacao de imagens

Comando aplicado:

```bash
gs -sDEVICE=pdfwrite -dCompatibilityLevel=1.7 -dNOPAUSE -dQUIET -dBATCH \
  -dDetectDuplicateImages=true \
  -sColorConversionStrategy=RGB -dProcessColorModel=/DeviceRGB \
  -dDownsampleColorImages=true -dColorImageDownsampleType=/Bicubic -dColorImageResolution=150 \
  -dDownsampleGrayImages=true -dGrayImageDownsampleType=/Bicubic -dGrayImageResolution=150 \
  -dAutoFilterColorImages=false -dColorImageFilter=/DCTEncode -dJPEGQ=80 \
  -sOutputFile="/Users/douglasvianagomes/Downloads/IDENTIDADE_SARAIVA_PNLD26_ARTE_VU_MP.optimized-rgb.pdf" \
  "/Users/douglasvianagomes/Downloads/IDENTIDADE_SARAIVA_PNLD26_ARTE_VU_MP.pdf"
```

Resultado apos compressao + linearizacao:
- Tamanho: `32,488,514 bytes` (`30.98 MB`)
- Reducao vs original: `44.38%`
- SHA256: `b717f14a3de08fb69af9a9713e34fa34754a58db5e57688c547943de007061bc`

## 2) Linearizacao
Ferramenta usada: `qpdf --linearize`.

Comando:

```bash
qpdf --linearize "/path/input.pdf" "/path/output.pdf"
```

No arquivo `optimized-rgb.pdf`, validacao final indicou:
- `File is linearized`
- sem erro estrutural em `qpdf --check`

## 3) Bookmarks hierarquicos (Unidade > Capitulo > Secao)
Fonte do sumario:
- Estrutura enviada pelo usuario e salva em: `scripts/pdf/toc_prototipo.txt`

Regra aplicada:
- Nivel 1: unidade e itens globais (inicio/fim do livro)
- Nivel 2: capitulo
- Nivel 3: secao
- Subsecao foi ignorada (conforme solicitado)

Pipeline aplicado:
1. Gerar arquivo `pdfmark` (.ps) a partir do texto do sumario.
2. Aplicar bookmarks com `ghostscript`.
3. Re-linearizar com `qpdf`.

Comandos:

```bash
python3 scripts/pdf/generate_bookmarks_ps.py \
  --toc scripts/pdf/toc_prototipo.txt \
  --out-ps /tmp/pdf_bookmarks/bookmarks_unit_chapter_section.ps \
  --out-preview /tmp/pdf_bookmarks/bookmarks_preview.txt

scripts/pdf/apply_bookmarks.sh \
  "/Users/douglasvianagomes/Downloads/IDENTIDADE_SARAIVA_PNLD26_ARTE_VU_MP.optimized-rgb.pdf" \
  /tmp/pdf_bookmarks/bookmarks_unit_chapter_section.ps \
  "/Users/douglasvianagomes/Downloads/IDENTIDADE_SARAIVA_PNLD26_ARTE_VU_MP.optimized-rgb.bookmarked.pdf"
```

Resultado final com bookmarks:
- Arquivo: `IDENTIDADE_SARAIVA_PNLD26_ARTE_VU_MP.optimized-rgb.bookmarked.pdf`
- Tamanho: `32,050,801 bytes` (`30.57 MB`)
- Paginas: `449`
- Linearizado: sim
- `qpdf --check`: sem erro estrutural
- Bookmarks topo: `9`
- Bookmarks totais: `174`
- Links internos preservados: `129`
- SHA256: `4c2e09788afa2a6c280e0f5abb07d091a720b35d9162679e009a94479c4c4cc9`

Top-level bookmarks finais:
- O trabalho com a BNCC
- Producoes em foco
- Nossa proposta
- UNIDADE 1: O QUE E ARTE?
- UNIDADE 2: ARTE PARA QUE?
- UNIDADE 3: ONDE ENCONTRAR ARTE?
- Enem e vestibulares
- Transcricao de audios
- Referencias bibliograficas comentadas

## 4) Validacoes funcionais executadas
Integridade/estrutura:

```bash
qpdf --show-npages "/Users/douglasvianagomes/Downloads/IDENTIDADE_SARAIVA_PNLD26_ARTE_VU_MP.optimized-rgb.bookmarked.pdf"
qpdf --check "/Users/douglasvianagomes/Downloads/IDENTIDADE_SARAIVA_PNLD26_ARTE_VU_MP.optimized-rgb.bookmarked.pdf"
```

Comparacao de texto extraivel (proxy de preservacao de conteudo):

```bash
gs -q -dNOPAUSE -dBATCH -sDEVICE=txtwrite -sOutputFile=- "/Users/douglasvianagomes/Downloads/IDENTIDADE_SARAIVA_PNLD26_ARTE_VU_MP.pdf" | wc -m
gs -q -dNOPAUSE -dBATCH -sDEVICE=txtwrite -sOutputFile=- "/Users/douglasvianagomes/Downloads/IDENTIDADE_SARAIVA_PNLD26_ARTE_VU_MP.optimized-rgb.bookmarked.pdf" | wc -m
```

Resultado:
- Original: `3,737,535` caracteres
- Final bookmarked: `3,537,991` caracteres
- Variacao: `-5.34%` (dentro da tolerancia de 10% definida no plano)

## Scripts criados neste projeto
Arquivos em `scripts/pdf/`:
- `optimize_rgb.sh`: gera PDF comprimido com perfil equilibrado e lineariza no final.
- `generate_bookmarks_ps.py`: converte um texto de sumario em arquivo `.ps` com `pdfmark` e gera preview da arvore.
- `apply_bookmarks.sh`: aplica bookmarks em PDF e re-lineariza.
- `validate_pdf.sh`: valida paginas, estrutura, links, outlines e (opcionalmente) compara texto extraivel com PDF de referencia.
- `toc_prototipo.txt`: texto-base do sumario usado para gerar os bookmarks.

## Como reproduzir em outro PDF
1. Ajuste o arquivo de sumario em `scripts/pdf/toc_prototipo.txt`.
2. Rode compressao:

```bash
scripts/pdf/optimize_rgb.sh "/caminho/entrada.pdf" "/caminho/saida.optimized-rgb.pdf"
```

3. Gere `pdfmark` e preview:

```bash
python3 scripts/pdf/generate_bookmarks_ps.py \
  --toc scripts/pdf/toc_prototipo.txt \
  --out-ps /tmp/bookmarks.ps \
  --out-preview /tmp/bookmarks-preview.txt
```

4. Aplique bookmarks + linearizacao:

```bash
scripts/pdf/apply_bookmarks.sh \
  "/caminho/saida.optimized-rgb.pdf" \
  /tmp/bookmarks.ps \
  "/caminho/saida.optimized-rgb.bookmarked.pdf"
```

5. Valide:

```bash
scripts/pdf/validate_pdf.sh "/caminho/saida.optimized-rgb.bookmarked.pdf" "/caminho/entrada.pdf"
```
