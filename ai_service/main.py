from fastapi import FastAPI, HTTPException, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import httpx
import json
import re
import fitz  # PyMuPDF
from docx import Document as DocxDocument
import io

app = FastAPI(title="havrs. Rental AI Service")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

OLLAMA_URL = "http://localhost:11434/api/generate"
MODEL_NAME = "llama3"



class AnalyzeRequest(BaseModel):
    document_text: str
    question: str = "Summarize this rental agreement and list key clauses."

class ChatRequest(BaseModel):
    message: str
    context: str = ""

class AIResponse(BaseModel):
    answer: str
    raw_text: str = ""
    status: str = "success"

class ClauseItem(BaseModel):
    title: str
    content: str

class RiskItem(BaseModel):
    title: str
    description: str
    severity: str  # "high", "medium", or "low"

class AnalysisResponse(BaseModel):
    summary: str
    key_clauses: list[ClauseItem] = []
    risks: list[RiskItem] = []
    overall_risk_level: str = "unknown"
    raw_text: str = ""
    status: str = "success"



def extract_text_from_pdf(file_bytes: bytes) -> str:
    try:
        doc = fitz.open(stream=file_bytes, filetype="pdf")
    except Exception:
        raise HTTPException(
            status_code=400,
            detail="Could not read this file. Please upload a valid, unencrypted PDF."
        )

    text = ""
    for page in doc:
        text += page.get_text()
    doc.close()

    if not text.strip():
        raise HTTPException(
            status_code=422,
            detail="No readable text found in this PDF. It may be a scanned image — text extraction isn't supported yet."
        )

    return text


def extract_text_from_docx(file_bytes: bytes) -> str:
    try:
        docx_file = io.BytesIO(file_bytes)
        document = DocxDocument(docx_file)
        paragraphs = [para.text for para in document.paragraphs if para.text.strip()]
        text = "\n".join(paragraphs)
    except Exception as e:
        raise HTTPException(
            status_code=400,
            detail=f"Could not read this Word document. Please make sure it is a valid .docx file. ({str(e)})"
        )

    if not text.strip():
        raise HTTPException(
            status_code=422,
            detail="No readable text found in this Word document. It may be empty or image-only."
        )

    return text


def extract_text_from_file(file_bytes: bytes, filename: str) -> str:
    """Dispatch text extraction based on file extension."""
    name_lower = filename.lower()
    if name_lower.endswith(".pdf"):
        return extract_text_from_pdf(file_bytes)
    elif name_lower.endswith(".docx"):
        return extract_text_from_docx(file_bytes)
    elif name_lower.endswith(".doc"):
        raise HTTPException(
            status_code=415,
            detail=(
                "Legacy .doc files are not supported. Please open the file in Microsoft Word "
                "or LibreOffice and save it as .docx or export it as a PDF, then upload again."
            )
        )
    else:
        raise HTTPException(
            status_code=415,
            detail="Unsupported file type. Please upload a PDF or .docx Word document."
        )


def extract_json_object(text: str) -> str:
    """
    Robustly extract a JSON object from model output.
    Handles:
      - Leading/trailing prose around the JSON
      - Markdown code fences (```json ... ```)
      - Trailing commas before ] or } (common Llama3 quirk)
      - Extra whitespace / newlines inside strings
    """
    # Step 1: strip markdown fences
    stripped = re.sub(r'```(?:json)?\s*', '', text).strip()
    stripped = stripped.replace('```', '').strip()

    # Step 2: grab everything between the outermost { and }
    start = stripped.find('{')
    end = stripped.rfind('}')
    if start != -1 and end != -1 and end > start:
        stripped = stripped[start:end + 1]

    # Step 3: remove trailing commas before ] or } (JSON spec violation Llama loves)
    stripped = re.sub(r',\s*([}\]])', r'\1', stripped)

    return stripped


async def call_ollama(prompt: str) -> str:
    """Send a prompt to Ollama and return the response text."""
    payload = {
        "model": MODEL_NAME,
        "prompt": prompt,
        "stream": False
    }

    try:
        async with httpx.AsyncClient(timeout=120.0) as client:
            response = await client.post(OLLAMA_URL, json=payload)
            response.raise_for_status()
            data = response.json()
            return data.get("response", "No response from model.")
    except httpx.ConnectError:
        raise HTTPException(
            status_code=503,
            detail="Cannot connect to Ollama. Make sure Ollama is running (run: ollama serve)."
        )
    except httpx.TimeoutException:
        raise HTTPException(
            status_code=504,
            detail="Ollama took too long to respond. Try a shorter document."
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Ollama error: {str(e)}")



@app.get("/")
def root():
    return {"message": "havrs. Rental AI Service is running!", "status": "ok"}


@app.get("/health")
def health_check():
    return {"status": "healthy", "model": MODEL_NAME}


@app.post("/analyze", response_model=AnalysisResponse)
async def analyze_document(file: UploadFile = File(...)):
    """
    Analyze a rental agreement PDF or DOCX.
    Accepts a multipart/form-data file upload, extracts its text,
    and runs it through the AI model, returning structured analysis.
    """
    file_bytes = await file.read()
    filename = file.filename or "document"
    document_text = extract_text_from_file(file_bytes, filename)

    prompt = f"""You are a legal assistant analyzing a rental agreement. Read the document below and respond with ONLY a valid JSON object, no other text, no markdown formatting, matching exactly this structure:

{{
  "summary": "a 3-4 sentence plain-language summary of the agreement",
  "key_clauses": [
    {{"title": "Rent Amount", "content": "plain language explanation"}},
    {{"title": "Security Deposit", "content": "plain language explanation"}},
    {{"title": "Lease Duration", "content": "plain language explanation"}}
  ],
  "risks": [
    {{"title": "short risk name", "description": "what the tenant should be aware of", "severity": "high"}}
  ],
  "overall_risk_level": "low"
}}

Rules:
- overall_risk_level and severity must be exactly one of: "low", "medium", "high"
- Include every clause type that is actually present in the document (rent, deposit, duration, pet policy, maintenance, termination, utilities, entry rights — only include ones mentioned)
- Only include real risks. If there are none, return an empty risks array.
- Respond with ONLY the JSON object. No explanation before or after.

Document:
---
{document_text}
---
"""

    raw_answer = await call_ollama(prompt)
    json_text = extract_json_object(raw_answer)

    try:
        parsed = json.loads(json_text)
        return AnalysisResponse(
            summary=parsed.get("summary", "No summary available."),
            key_clauses=parsed.get("key_clauses", []),
            risks=parsed.get("risks", []),
            overall_risk_level=parsed.get("overall_risk_level", "unknown"),
            raw_text=document_text
        )
    except (json.JSONDecodeError, ValueError) as e:
        print(f"[analyze] JSON parse failed: {e}")
        print(f"[analyze] Extracted JSON text was:\n{json_text}")
        print(f"[analyze] Raw model output was:\n{raw_answer}")

        # Best-effort: try to pull just the summary string value
        fallback_summary = "AI analysis completed but the response could not be fully parsed."
        summary_match = re.search(r'"summary"\s*:\s*"((?:[^"\\]|\\.)*)"\s*[,}]', json_text, re.DOTALL)
        if summary_match:
            fallback_summary = summary_match.group(1).replace('\\"', '"').replace('\\n', '\n')

        return AnalysisResponse(
            summary=fallback_summary,
            key_clauses=[],
            risks=[],
            overall_risk_level="unknown",
            raw_text=document_text
        )

@app.post("/chat", response_model=AIResponse)
async def chat(request: ChatRequest):
    """
    General chat endpoint for follow-up questions about rental documents.
    """
    if request.context:
        prompt = f"""You are a helpful rental agreement assistant.

Context from the document:
{request.context}

User's message: {request.message}

Give a helpful, concise answer based on the context above.

Response:"""
    else:
        prompt = f"""You are a helpful rental agreement assistant.

User's message: {request.message}

Give a helpful, concise answer about rental agreements and tenant rights.

Response:"""

    answer = await call_ollama(prompt)
    return AIResponse(answer=answer)


@app.post("/extract-clauses", response_model=AIResponse)
async def extract_clauses(request: AnalyzeRequest):
    """
    Extract and categorize key clauses from a rental document.
    """
    prompt = f"""You are a legal document analyst specializing in rental agreements.

Analyze this rental document and extract all key clauses:

---
{request.document_text}
---

Please extract and categorize the following (if present):
1. 🏠 Rent Amount & Due Date
2. 📅 Lease Duration (Start & End Date)
3. 🔒 Security Deposit Details
4. 🐾 Pet Policy
5. 🔧 Maintenance Responsibilities
6. ❌ Termination / Notice Period
7. 🚫 Prohibited Activities
8. ⚡ Utilities (who pays what)
9. 🔑 Entry & Inspection Rights
10. 📋 Any Other Important Clauses

For each clause found, state it clearly in simple terms.
If a clause is not mentioned in the document, write "Not specified".

Response:"""

    answer = await call_ollama(prompt)
    return AIResponse(answer=answer)