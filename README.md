# 🎓 Student Sphere AI – AI-Powered Student Support Chatbot

> **An intelligent conversational assistant designed to support students with academic and general information through natural language interaction.**

Student Sphere AI is a full-stack conversational AI web application designed to provide students with accessible and interactive academic support.

The platform combines a modern **React frontend**, **FastAPI backend**, and **Google Gemini AI** to provide a ChatGPT-inspired conversational experience with persistent chat management, file support, conversation organization, and a user-friendly interface.

---

# 🎯 Problem

University students often need quick access to explanations, learning assistance, and general academic information.

Traditional support systems may require students to search through multiple resources or wait for assistance, making it difficult to obtain immediate and contextual support.

Student Sphere AI addresses this by providing an interactive AI-powered environment where students can communicate naturally with an intelligent assistant.

---

# 💡 Solution

Student Sphere AI provides a centralized conversational interface where students can:

- Ask academic and general questions
- Receive AI-generated explanations
- Maintain multiple conversations
- Continue previous conversations
- Attach supported files for AI-assisted interactions
- Organize and manage conversations
- Export conversations
- Customize the application interface

The system is designed around a simple workflow:

```text
Ask → Understand → Respond → Continue Learning

✨ Key Features
🤖 AI-Powered Assistance
- Natural language interaction with an AI assistant
- AI-generated responses using Google Gemini
- Academic explanations and learning assistance
- Context-aware conversational interactions

💬 Chat Management
- Create new conversations
- Maintain multiple chat sessions
- Switch between conversations
- Continue previous conversations
- Manage conversation history

📎 File Support
- Attach supported files to conversations
- Use uploaded content as part of AI-assisted interactions
- Provide additional context for questions

💾 Data Persistence
- Persistent conversation data using browser local storage
- Conversations remain available between sessions
- Local storage-based state management

📤 Conversation Export
- Export conversation content
- Preserve useful AI-assisted discussions for future reference

🎨 User Experience
- Modern ChatGPT-inspired interface
- Responsive user interface
- Clean and intuitive navigation
- Theme customization
- User-focused interaction design

🏗️ System Architecture
┌──────────────────────────────────────┐
│            Student Sphere AI         │
│                                      │
│             React Frontend           │
│                                      │
│  • Chat Interface                    │
│  • Conversation Management           │
│  • File Uploads                      │
│  • User Interface                    │
│  • Theme Customization               │
└──────────────────┬───────────────────┘
                   │
                   │ HTTP / REST API
                   ▼
┌──────────────────────────────────────┐
│             FastAPI Backend          │
│                                      │
│  • API Endpoints                     │
│  • Request Handling                  │
│  • Data Validation                   │
│  • AI Service Integration            │
└──────────────────┬───────────────────┘
                   │
                   │ API Request
                   ▼
┌──────────────────────────────────────┐
│           Google Gemini AI           │
│                                      │
│  • Natural Language Processing       │
│  • Response Generation               │
│  • Contextual Assistance             │
└──────────────────────────────────────┘

                   │
                   ▼
┌──────────────────────────────────────┐
│          Browser Local Storage       │
│                                      │
│  • Conversation History              │
│  • Application State                 │
└──────────────────────────────────────┘

🔄 Application Workflow
              Student
                 │
                 ▼
       ┌──────────────────┐
       │ Open Student     │
       │ Sphere AI        │
       └────────┬─────────┘
                │
                ▼
       ┌──────────────────┐
       │ Create / Select  │
       │ Conversation     │
       └────────┬─────────┘
                │
                ▼
       ┌──────────────────┐
       │ Enter Question   │
       │ or Attach File   │
       └────────┬─────────┘
                │
                ▼
       ┌──────────────────┐
       │ React Frontend   │
       └────────┬─────────┘
                │
                ▼
       ┌──────────────────┐
       │ FastAPI Backend  │
       └────────┬─────────┘
                │
                ▼
       ┌──────────────────┐
       │ Google Gemini AI │
       └────────┬─────────┘
                │
                ▼
       ┌──────────────────┐
       │ AI Response      │
       └────────┬─────────┘
                │
                ▼
       ┌──────────────────┐
       │ Display Response │
       │ & Save Chat      │
       └──────────────────┘

🛠️ Technology Stack
🌐 Frontend
- React.js
- JavaScript (ES6+)
- Axios
- React Markdown
- CSS3
⚙️ Backend
- FastAPI
- Python
- Pydantic
- Uvicorn
🤖 AI Layer
- Google Gemini AI
- Gemini 2.5 Flash
💾 Storage
- Browser Local Storage

🧠 AI Interaction
The application uses Google Gemini AI to generate natural-language responses to student questions.
The basic interaction flow is:
Student Question
       │
       ▼
React Frontend
       │
       ▼
FastAPI Backend
       │
       ▼
Google Gemini AI
       │
       ▼
Generated Response
       │
       ▼
React Chat Interface

This architecture separates the user interface from the backend API and AI integration layer, making the application easier to maintain and extend.

🎓 Target Users
Student Sphere AI is primarily designed for:
- 🎓 University students
- 📚 Learners seeking academic assistance
- 💻 Students looking for programming and technical explanations
- 🧑‍🎓 Students who need an interactive learning assistant

🌱 Future Improvements
Potential future improvements include:
- 🔐 User authentication
- 🗄️ Database-backed conversation storage
- 🎙️ Voice-based conversations
- 🖼️ OCR and image-based question support
- 📊 Conversation analytics
- ☁️ Cloud deployment
- 👤 User profiles
- 📈 Personalized learning history
- 🔄 Improved conversational context management

🎯 Project Goals
Student Sphere AI was developed to explore the integration of:
- Full-stack web development
- REST API development
- Generative AI
- Conversational interfaces
- AI API integration
- Client-side data persistence
- User-centered interface design
The project demonstrates how modern web technologies and generative AI can be combined to create a practical student-focused application.

👩‍💻 Author
Dhakshanyah Rajendra
BSc in Information and Communication Technology
Rajarata University of Sri Lanka

🔗 Connect With Me
🌐 Portfolio
https://dhaksha28rajendra.github.io/my-portfolio/
💼 LinkedIn
https://www.linkedin.com/in/dhakshanyah-rajendra-3213b6315/
📧 Email
dhaksharajendra@gmail.com
