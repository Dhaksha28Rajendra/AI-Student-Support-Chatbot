from fastapi import FastAPI, Request, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from google import genai
from google.genai import types
from typing import List
from PyPDF2 import PdfReader
from docx import Document
import asyncio
import logging
import re
import json
import io

# API KEY
API_KEY = "PASS_KEY"

# Gemini Client
client = genai.Client(api_key=API_KEY)

# FastAPI App
app = FastAPI()

# Logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Message Model
class Message(BaseModel):
    role: str
    content: str

# Request Body
class ChatRequest(BaseModel):
    messages: List[Message]


def build_chat_title(text: str) -> str:
    stop_words = {
        "a", "an", "the", "and", "or", "to", "of", "for", "in", "on", "at",
        "with", "from", "about", "please", "tell", "me", "is", "are", "was",
        "were", "be", "been", "being", "do", "does", "did", "can", "could",
        "would", "should", "what", "why", "how", "who", "when", "where",
        "which", "this", "that", "these", "those", "it", "its", "their",
        "your", "my", "our", "i", "you", "we", "they", "related", "relation",
        "anything", "something", "give", "describe", "explain", "show",
        "help", "define", "kind", "type", "term"
    }

    words = re.findall(r"[A-Za-z0-9']+", text or "")
    filtered = [w for w in words if w.lower() not in stop_words]

    if not filtered:
        filtered = words

    if not filtered:
        return "New Chat"

    title = " ".join(filtered[:5]).strip()
    if not title:
        return "New Chat"

    title = title[:1].upper() + title[1:]

    if len(title) > 40:
        title = title[:40].rstrip() + "..."

    return title


def clean_text(text: str, limit: int = 12000) -> str:
    text = re.sub(r"\s+", " ", text or "").strip()
    if len(text) > limit:
        text = text[:limit].rstrip() + "..."
    return text


def extract_pdf_text(file_bytes: bytes) -> str:
    try:
        reader = PdfReader(io.BytesIO(file_bytes))
        parts = []
        for page in reader.pages:
            page_text = page.extract_text() or ""
            if page_text.strip():
                parts.append(page_text.strip())
        return clean_text("\n".join(parts))
    except Exception:
        return ""


def extract_docx_text(file_bytes: bytes) -> str:
    try:
        doc = Document(io.BytesIO(file_bytes))
        parts = [p.text.strip() for p in doc.paragraphs if p.text.strip()]
        return clean_text("\n".join(parts))
    except Exception:
        return ""


def normalize_messages(raw_messages) -> List[Message]:
    messages: List[Message] = []
    if isinstance(raw_messages, list):
        for item in raw_messages:
            if isinstance(item, dict) and "role" in item and "content" in item:
                messages.append(Message(role=item["role"], content=item["content"]))
    return messages


async def generate_with_timeout(contents, timeout_seconds: int = 90):
    return await asyncio.wait_for(
        asyncio.to_thread(
            client.models.generate_content,
            model="gemini-2.5-flash",
            contents=contents
        ),
        timeout=timeout_seconds
    )


async def handle_chat_request(request: Request):
    try:
        content_type = request.headers.get("content-type", "").lower()

        messages: List[Message] = []
        question = ""
        uploaded_files = []

        # Multipart/form-data path for attachments
        if "multipart/form-data" in content_type:
            form = await request.form()

            question = str(form.get("message") or form.get("question") or "").strip()

            messages_raw = form.get("messages")
            if messages_raw:
                try:
                    parsed = json.loads(messages_raw)
                    messages = normalize_messages(parsed)
                except Exception:
                    messages = []

            uploaded_files = list(form.getlist("files") or form.getlist("file"))

            if not question and messages:
                question = messages[-1].content.strip()

        # JSON path for normal chat
        else:
            payload = await request.json()

            if isinstance(payload, dict) and isinstance(payload.get("messages"), list):
                messages = normalize_messages(payload["messages"])
                if messages:
                    question = messages[-1].content.strip()
            else:
                question = str(
                    payload.get("message")
                    or payload.get("question")
                    or ""
                ).strip()

        if not question and not messages and not uploaded_files:
            return {
                "reply": "⚠️ No question received.",
                "title": "New Chat"
            }

        # -----------------------------
        # TEXT-ONLY CHAT
        # -----------------------------
        if not uploaded_files:
            conversation = [
                {
                    "role": msg.role,
                    "parts": [
                        {
                            "text": msg.content
                        }
                    ]
                }
                for msg in messages
            ]

            if not conversation and question:
                conversation = [
                    {
                        "role": "user",
                        "parts": [{"text": question}]
                    }
                ]

            response = await generate_with_timeout(conversation, timeout_seconds=90)
            reply_text = getattr(response, "text", None) or "⚠️ No response generated."

            first_user_message = next(
                (msg.content for msg in messages if msg.role == "user"),
                question or "New Chat"
            )

            return {
                "reply": reply_text,
                "title": build_chat_title(first_user_message)
            }

        # -----------------------------
        # FILE CHAT
        # -----------------------------
        image_parts = []
        attachment_notes = []
        unsupported_files = []
        attachment_names = []

        for file_obj in uploaded_files:
            filename = getattr(file_obj, "filename", "uploaded_file")
            attachment_names.append(filename)

            content_type = (getattr(file_obj, "content_type", "") or "").lower()
            file_bytes = await file_obj.read()

            # Images
            if content_type.startswith("image/") or filename.lower().endswith((".png", ".jpg", ".jpeg", ".webp")):
                if filename.lower().endswith(".jpg"):
                    mime_type = "image/jpeg"
                elif filename.lower().endswith(".jpeg"):
                    mime_type = "image/jpeg"
                elif filename.lower().endswith(".webp"):
                    mime_type = "image/webp"
                elif content_type.startswith("image/"):
                    mime_type = content_type
                else:
                    mime_type = "image/png"

                image_parts.append(
                    types.Part.from_bytes(
                        data=file_bytes,
                        mime_type=mime_type
                    )
                )

            # PDF
            elif content_type == "application/pdf" or filename.lower().endswith(".pdf"):
                pdf_text = extract_pdf_text(file_bytes)
                if pdf_text:
                    attachment_notes.append(f"[PDF: {filename}]\n{pdf_text}")
                else:
                    attachment_notes.append(f"[PDF: {filename}] (No readable text found)")

            # DOCX
            elif (
                content_type
                == "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                or filename.lower().endswith(".docx")
            ):
                docx_text = extract_docx_text(file_bytes)
                if docx_text:
                    attachment_notes.append(f"[DOCX: {filename}]\n{docx_text}")
                else:
                    attachment_notes.append(f"[DOCX: {filename}] (No readable text found)")

            # TXT
            elif content_type == "text/plain" or filename.lower().endswith(".txt"):
                try:
                    txt = file_bytes.decode("utf-8", errors="ignore").strip()
                except Exception:
                    txt = ""

                if txt:
                    attachment_notes.append(f"[TXT: {filename}]\n{clean_text(txt)}")
                else:
                    attachment_notes.append(f"[TXT: {filename}] (Empty or unreadable text)")

            # DOC is not supported by python-docx
            elif filename.lower().endswith(".doc"):
                unsupported_files.append(f"{filename} (DOC is not supported; please use DOCX)")

            # Anything else
            else:
                unsupported_files.append(filename)

        history_text = ""
        if len(messages) > 1:
            history_lines = [
                f"{msg.role.upper()}: {msg.content}"
                for msg in messages[:-1]
            ]
            history_text = "\n".join(history_lines).strip()

        title_source = question or (attachment_names[0] if attachment_names else "New Chat")

        prompt_sections = [
            "You are an AI student support chatbot. Answer clearly and helpfully.",
            f"User question:\n{question or 'Describe the uploaded file(s).'}"
        ]

        if history_text:
            prompt_sections.append(f"Conversation history:\n{history_text}")

        if attachment_notes:
            prompt_sections.append("Extracted attachment text:\n" + "\n\n".join(attachment_notes))

        if unsupported_files:
            prompt_sections.append(
                "Unsupported uploaded files:\n" + "\n".join(unsupported_files)
            )

        prompt_sections.append(
            "Use the uploaded attachment content to answer the user's question. "
            "If the user asks about the attachment, prioritize the attachment content."
        )

        final_prompt = "\n\n".join(prompt_sections)

        if image_parts:
            contents = [final_prompt, *image_parts]
        else:
            contents = final_prompt

        response = await generate_with_timeout(contents, timeout_seconds=90)
        reply_text = getattr(response, "text", None) or "⚠️ No response generated."

        return {
            "reply": reply_text,
            "title": build_chat_title(title_source)
        }

    except asyncio.TimeoutError:
        logger.exception("Gemini request timed out")
        return {
            "reply": "⚠️ The AI response took too long. Please try again.",
            "title": "New Chat"
        }

    except Exception as e:
        logger.exception("Chat error")
        return {
            "reply": f"⚠️ Error: {str(e)}",
            "title": "New Chat"
        }


@app.get("/health")
def health():
    return {"status": "ok"}


@app.post("/chat")
async def chat(request: Request):
    return await handle_chat_request(request)


@app.post("/chat-with-file")
async def chat_with_file(request: Request):
    return await handle_chat_request(request)