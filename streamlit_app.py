#!/usr/bin/env python3
from __future__ import annotations

import os
import shutil
import subprocess
import tempfile
from dataclasses import dataclass
from pathlib import Path

import streamlit as st


APP_TITLE = "PDF Optimizer (Ghostscript + qpdf)"


@dataclass
class CmdResult:
    code: int
    stdout: str
    stderr: str
    cmd: str


def run_cmd(cmd: list[str], cwd: Path | None = None) -> CmdResult:
    proc = subprocess.run(
        cmd,
        cwd=str(cwd) if cwd else None,
        text=True,
        capture_output=True,
    )
    return CmdResult(
        code=proc.returncode,
        stdout=proc.stdout.strip(),
        stderr=proc.stderr.strip(),
        cmd=" ".join(cmd),
    )


def require_binary(name: str) -> str:
    found = shutil.which(name)
    if not found:
        raise RuntimeError(f"Dependencia ausente: `{name}`")
    return found


def file_size_text(path: Path) -> str:
    size = path.stat().st_size
    return f"{size:,} bytes ({size / 1024 / 1024:.2f} MB)"


def optimize_pdf(
    input_pdf: Path,
    output_pdf: Path,
    color_resolution: int,
    gray_resolution: int,
    jpeg_quality: int,
) -> list[CmdResult]:
    tmp_unlinearized = output_pdf.with_suffix(".tmp.unlinearized.pdf")

    gs_cmd = [
        "gs",
        "-sDEVICE=pdfwrite",
        "-dCompatibilityLevel=1.7",
        "-dNOPAUSE",
        "-dQUIET",
        "-dBATCH",
        "-dDetectDuplicateImages=true",
        "-sColorConversionStrategy=RGB",
        "-dProcessColorModel=/DeviceRGB",
        "-dDownsampleColorImages=true",
        "-dColorImageDownsampleType=/Bicubic",
        f"-dColorImageResolution={color_resolution}",
        "-dDownsampleGrayImages=true",
        "-dGrayImageDownsampleType=/Bicubic",
        f"-dGrayImageResolution={gray_resolution}",
        "-dAutoFilterColorImages=false",
        "-dColorImageFilter=/DCTEncode",
        f"-dJPEGQ={jpeg_quality}",
        f"-sOutputFile={tmp_unlinearized}",
        str(input_pdf),
    ]
    qpdf_linearize_cmd = [
        "qpdf",
        "--linearize",
        str(tmp_unlinearized),
        str(output_pdf),
    ]
    qpdf_check_cmd = [
        "qpdf",
        "--check",
        str(output_pdf),
    ]

    results: list[CmdResult] = []
    results.append(run_cmd(gs_cmd))
    if results[-1].code != 0:
        return results

    results.append(run_cmd(qpdf_linearize_cmd))
    if results[-1].code != 0:
        return results

    if tmp_unlinearized.exists():
        tmp_unlinearized.unlink()

    results.append(run_cmd(qpdf_check_cmd))
    return results


def build_ui() -> None:
    st.set_page_config(page_title=APP_TITLE, layout="wide")
    st.title(APP_TITLE)
    st.caption("Fluxo: compressao com Ghostscript + linearizacao com qpdf")

    with st.sidebar:
        st.subheader("Dependencias")
        deps = ("gs", "qpdf")
        dep_status: dict[str, str] = {}
        for dep in deps:
            dep_status[dep] = shutil.which(dep) or ""
            if dep_status[dep]:
                st.success(f"{dep}: ok")
            else:
                st.error(f"{dep}: ausente")

        st.divider()
        st.subheader("Parametros")
        color_resolution = st.slider("Color DPI", 72, 300, 150, 1)
        gray_resolution = st.slider("Gray DPI", 72, 300, 150, 1)
        jpeg_quality = st.slider("JPEG quality", 40, 95, 80, 1)

    uploaded_pdf = st.file_uploader("Upload do PDF", type=["pdf"])
    output_name = st.text_input("Nome do arquivo de saida", value="output.optimized-linearized.pdf")

    if uploaded_pdf is None:
        st.info("Envie um PDF para habilitar o processamento.")
        return

    st.subheader("Arquivo de entrada")
    input_bytes = uploaded_pdf.getvalue()
    st.write(f"- Nome: `{uploaded_pdf.name}`")
    st.write(f"- Tamanho: `{len(input_bytes):,} bytes ({len(input_bytes)/1024/1024:.2f} MB)`")

    if st.button("Otimizar PDF", type="primary"):
        missing = [dep for dep in ("gs", "qpdf") if not dep_status[dep]]
        if missing:
            st.error(f"Dependencias ausentes: {', '.join(missing)}")
            return

        if not output_name.lower().endswith(".pdf"):
            st.error("O nome de saida precisa terminar com .pdf")
            return

        with tempfile.TemporaryDirectory(prefix="pdf_opt_app_") as tmp_dir:
            tmp_path = Path(tmp_dir)
            input_path = tmp_path / "input.pdf"
            output_path = tmp_path / output_name
            input_path.write_bytes(input_bytes)

            with st.status("Processando PDF...", expanded=True) as status:
                status.write("Executando Ghostscript (compressao)...")
                results = optimize_pdf(
                    input_pdf=input_path,
                    output_pdf=output_path,
                    color_resolution=color_resolution,
                    gray_resolution=gray_resolution,
                    jpeg_quality=jpeg_quality,
                )

                for res in results:
                    status.write(f"`$ {res.cmd}`")
                    if res.stdout:
                        status.code(res.stdout)
                    if res.stderr:
                        status.code(res.stderr)
                    if res.code != 0:
                        status.update(label="Falha no processamento", state="error", expanded=True)
                        st.error("Processo interrompido. Veja os logs acima.")
                        return

                if not output_path.exists():
                    status.update(label="Falha no processamento", state="error", expanded=True)
                    st.error("Arquivo de saida nao foi gerado.")
                    return

                status.update(label="Processamento concluido", state="complete", expanded=False)

            out_bytes = output_path.read_bytes()
            before_size = input_path.stat().st_size
            after_size = output_path.stat().st_size
            reduction = (1 - (after_size / before_size)) * 100 if before_size else 0

            st.subheader("Resultado")
            c1, c2, c3 = st.columns(3)
            c1.metric("Entrada", f"{before_size/1024/1024:.2f} MB")
            c2.metric("Saida", f"{after_size/1024/1024:.2f} MB")
            c3.metric("Reducao", f"{reduction:.2f}%")

            st.write(f"- Entrada: `{file_size_text(input_path)}`")
            st.write(f"- Saida: `{file_size_text(output_path)}`")

            st.download_button(
                label="Baixar PDF otimizado",
                data=out_bytes,
                file_name=output_name,
                mime="application/pdf",
                use_container_width=True,
            )


if __name__ == "__main__":
    try:
        require_binary("gs")
        require_binary("qpdf")
    except RuntimeError:
        # A UI informa o status de dependencias de qualquer forma.
        pass
    build_ui()
