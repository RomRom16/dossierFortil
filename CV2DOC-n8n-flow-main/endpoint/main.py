from pathlib import Path
import tempfile
import shutil
from typing import Annotated

from fastapi import FastAPI, File, UploadFile, HTTPException
from fastapi.responses import FileResponse, JSONResponse

from cv2doc.main import run_processing
from cv2doc.analyse_cv.ai_analyzing import analyze_img
from cv2doc.helpers.pdf_rendering import pdf2imgs
from cv2doc.settings import CV2DOCSettings

try:
    from langchain_google_genai.chat_models import ChatGoogleGenerativeAIError
except ImportError:
    ChatGoogleGenerativeAIError = Exception

app = FastAPI()

@app.get("/")
def read_root():
    return {"Hello": "World"}


@app.post("/process_cv/")
def process_cv(cv: Annotated[UploadFile, File(description="A file read as UploadFile")]):
    if cv.content_type not in {"application/pdf", "application/x-pdf"}:
        raise HTTPException(status_code=415, detail="Only PDF files are supported")
    
    with tempfile.TemporaryDirectory() as td:
        pdf_path = Path(td) / (cv.filename or "cv.pdf")
        with pdf_path.open("wb") as f:
            shutil.copyfileobj(cv.file, f)
        print(f"starting processing for {pdf_path}")
        result_doc = run_processing(pdf_path)

    return FileResponse(
        path=result_doc,
        media_type="application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        filename=result_doc.name,
    )

@app.post("/extract_json/")
def extract_json(cv: Annotated[UploadFile, File(description="A file read as UploadFile")]):
    if cv.content_type not in {"application/pdf", "application/x-pdf"}:
        raise HTTPException(status_code=415, detail="Only PDF files are supported")

    try:
        with tempfile.TemporaryDirectory() as td:
            pdf_path = Path(td) / (cv.filename or "cv.pdf")
            with pdf_path.open("wb") as f:
                shutil.copyfileobj(cv.file, f)

            settings = CV2DOCSettings()
            image_data = pdf2imgs(pdf_path)
            result = analyze_img(image_data, settings)

            return JSONResponse(content=result.model_dump())
    except ChatGoogleGenerativeAIError as e:
        err_str = str(e).lower()
        if "429" in err_str or "resource_exhausted" in err_str or "quota" in err_str:
            return JSONResponse(
                status_code=503,
                content={
                    "error": "quota_exhausted",
                    "message": "Quota API Gemini épuisé. Créez une nouvelle clé sur aistudio.google.com ou attendez le reset du quota.",
                },
            )
        return JSONResponse(status_code=503, content={"error": str(e)})