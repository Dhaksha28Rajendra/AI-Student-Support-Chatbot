from fastapi import FastAPI, UploadFile, File, Form
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from google import genai
from typing import List

# API KEY
API_KEY = "PASS_KEY"

# Gemini Client
client = genai.Client(api_key=API_KEY)

# FastAPI App
app = FastAPI()

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

@app.post("/chat-with-file")
async def chat_with_file(
    question: str = Form(...),
    file: UploadFile = File(...)
):

    try:

        file_bytes = await file.read()

        prompt = f"""
        User Question:
        {question}

        Attached File:
        {file.filename}

        Analyze the uploaded file and answer the question.
        """

        response = client.models.generate_content(
            model="gemini-2.5-flash",
            contents=[
                prompt,
                {
                    "mime_type": file.content_type,
                    "data": file_bytes
                }
            ]
        )

        return {
            "reply": response.text
        }

    except Exception as e:

        return {
            "reply": f"⚠️ File processing error: {str(e)}"
        }    

# Chat Endpoint
@app.post("/chat")
def chat(request: ChatRequest):

    try:

        # Convert messages into Gemini format
        conversation = []

        for msg in request.messages:

            conversation.append(
                {
                    "role": msg.role,
                    "parts": [
                        {
                            "text": msg.content
                        }
                    ]
                }
            )

        # Generate response
        response = client.models.generate_content(
            model="gemini-2.5-flash",
            contents=conversation
        )

        return {
            "reply": response.text
        }

    except Exception as e:

        return {
            "reply": f"⚠️ Error: {str(e)}"
        }