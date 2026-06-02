import { useState, useEffect, useRef } from "react";
import axios from "axios";
import ReactMarkdown from "react-markdown";
import "./App.css";

const createId = () => Date.now() + Math.floor(Math.random() * 1000);

const createDefaultChat = () => ({
  id: createId(),
  title: "New Chat",
  messages: [],
  updatedAt: Date.now(),
});

const sortConversationsByRecent = (list) =>
  [...list].sort((a, b) => (b.updatedAt ?? 0) - (a.updatedAt ?? 0));

const normalizeConversation = (chat, index, total) => {
  const fallbackOrder = total - index;

  return {
    id: typeof chat.id === "number" ? chat.id : createId(),
    title:
      typeof chat.title === "string" && chat.title.trim()
        ? chat.title
        : "New Chat",
    messages: Array.isArray(chat.messages) ? chat.messages : [],
    updatedAt:
      typeof chat.updatedAt === "number" ? chat.updatedAt : fallbackOrder,
  };
};

const loadConversationsFromStorage = () => {
  const savedChatsRaw = localStorage.getItem("conversations");

  if (!savedChatsRaw) {
    return [createDefaultChat()];
  }

  try {
    const parsed = JSON.parse(savedChatsRaw);

    if (!Array.isArray(parsed) || parsed.length === 0) {
      return [createDefaultChat()];
    }

    return parsed.map((chat, index) =>
      normalizeConversation(chat, index, parsed.length)
    );
  } catch {
    return [createDefaultChat()];
  }
};

const capitalizeWord = (word) =>
  word ? `${word.charAt(0).toUpperCase()}${word.slice(1).toLowerCase()}` : "";

const buildSmartChatTitle = (text) => {
  const cleaned = text
    .replace(/[^\w\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  if (!cleaned) return "New Chat";

  const commonFillerWords = new Set([
    "a",
    "an",
    "the",
    "and",
    "or",
    "to",
    "of",
    "for",
    "in",
    "on",
    "at",
    "with",
    "from",
    "about",
    "please",
    "tell",
    "me",
    "is",
    "are",
    "was",
    "were",
    "be",
    "been",
    "being",
    "do",
    "does",
    "did",
    "can",
    "could",
    "would",
    "should",
    "what",
    "why",
    "how",
    "who",
    "when",
    "where",
    "which",
    "this",
    "that",
    "these",
    "those",
    "it",
    "its",
    "their",
    "your",
    "my",
    "our",
    "i",
    "you",
    "we",
    "they",
    "related",
    "relation",
    "anything",
    "something",
    "give",
    "describe",
    "explain",
    "show",
    "help",
    "define",
    "kind",
    "type",
    "term",
  ]);

  const words = cleaned.split(" ").filter(Boolean);

  const filteredWords = words.filter((word, index) => {
    const lower = word.toLowerCase();
    if (index === 0 && commonFillerWords.has(lower)) return false;
    return !commonFillerWords.has(lower);
  });

  const sourceWords = filteredWords.length > 0 ? filteredWords : words;
  const titleWords = sourceWords.slice(0, 5).map(capitalizeWord);
  const title = titleWords.join(" ").trim();

  if (!title) return "New Chat";
  if (title.length <= 40) return title;
  return `${title.slice(0, 40).trimEnd()}...`;
};

const buildAttachmentTitle = (files) => {
  if (!files.length) return "New Chat";

  const names = files
    .slice(0, 2)
    .map((file) => file.name.replace(/\.[^/.]+$/, "").trim())
    .filter(Boolean);

  if (!names.length) return "New Chat";

  const joined = names.join(" + ");
  if (joined.length <= 40) return joined;

  return `${joined.slice(0, 40).trimEnd()}...`;
};

const buildAttachmentSummary = (files) => {
  if (!files.length) return "";

  const firstTwo = files.slice(0, 2).map((file) => file.name);
  const extraCount = files.length - firstTwo.length;

  if (files.length === 1) {
    return `📎 ${firstTwo[0]}`;
  }

  return `📎 ${firstTwo.join(", ")}${extraCount > 0 ? ` + ${extraCount} more` : ""}`;
};

const formatFileSize = (bytes) => {
  if (bytes < 1024) return `${bytes} B`;
  const kb = bytes / 1024;
  if (kb < 1024) return `${kb.toFixed(1)} KB`;
  const mb = kb / 1024;
  return `${mb.toFixed(1)} MB`;
};

const isSupportedAttachment = (file) => {
  const mime = (file.type || "").toLowerCase();
  const name = file.name.toLowerCase();

  if (mime === "application/pdf") return true;
  if (mime === "text/plain") return true;
  if (mime === "application/msword") return true;
  if (
    mime ===
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
  )
    return true;

  if (mime.startsWith("image/")) return true;
  if (mime.startsWith("audio/")) return true;
  if (mime.startsWith("video/")) return true;

  if (
    name.endsWith(".pdf") ||
    name.endsWith(".txt") ||
    name.endsWith(".doc") ||
    name.endsWith(".docx") ||
    name.endsWith(".png") ||
    name.endsWith(".jpg") ||
    name.endsWith(".jpeg") ||
    name.endsWith(".webp") ||
    name.endsWith(".mp3") ||
    name.endsWith(".wav") ||
    name.endsWith(".mp4") ||
    name.endsWith(".webm")
  ) {
    return true;
  }

  return false;
};

const isAudioOrVideo = (file) => {
  const mime = (file.type || "").toLowerCase();
  return mime.startsWith("audio/") || mime.startsWith("video/");
};

const getMediaDuration = (file) =>
  new Promise((resolve, reject) => {
    const objectUrl = URL.createObjectURL(file);
    const mime = (file.type || "").toLowerCase();

    const element = mime.startsWith("audio/")
      ? new Audio()
      : document.createElement("video");

    element.preload = "metadata";

    element.onloadedmetadata = () => {
      URL.revokeObjectURL(objectUrl);
      resolve(element.duration || 0);
    };

    element.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error(`Could not read media metadata for ${file.name}`));
    };

    element.src = objectUrl;
  });

function App() {
  const [message, setMessage] = useState("");
  const [searchTerm, setSearchTerm] = useState("");

  const [darkMode, setDarkMode] = useState(() => {
    const savedTheme = localStorage.getItem("darkMode");
    return savedTheme ? JSON.parse(savedTheme) : false;
  });

  const [conversations, setConversations] = useState(() =>
    loadConversationsFromStorage()
  );

  const [currentChatId, setCurrentChatId] = useState(null);

  const [loading, setLoading] = useState(false);
  const [editingChatId, setEditingChatId] = useState(null);
  const [editedTitle, setEditedTitle] = useState("");
  const [selectedFiles, setSelectedFiles] = useState([]);

  const fileInputRef = useRef(null);
  const abortControllerRef = useRef(null);
  const latestMessageRef = useRef(null);
  const typingIndicatorRef = useRef(null);

  const currentConversation = conversations.find(
    (chat) => chat.id === currentChatId
  );

  const messages = currentConversation ? currentConversation.messages : [];
  const hasMessages = messages.length > 0;
  const showWelcome = !hasMessages;

  const sortedConversations = sortConversationsByRecent(conversations);
  const filteredConversations = sortedConversations.filter((chat) =>
    chat.title.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const recentChatsStyle = {
    fontSize: "14px",
    fontWeight: 600,
    color: darkMode ? "#d7c0b0" : "#6b4a3a",
    margin: "12px 0 10px",
    paddingLeft: "4px",
  };

  useEffect(() => {
    localStorage.setItem("conversations", JSON.stringify(conversations));
  }, [conversations]);

  useEffect(() => {
    localStorage.setItem("darkMode", JSON.stringify(darkMode));
  }, [darkMode]);

  useEffect(() => {
    const scrollTarget = loading
      ? typingIndicatorRef.current
      : latestMessageRef.current;

    if (!scrollTarget) return;

    requestAnimationFrame(() => {
      scrollTarget.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    });
  }, [messages.length, loading, currentChatId]);

  const clearSelectedFiles = () => {
    setSelectedFiles([]);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const createNewChat = () => {
    const newChat = createDefaultChat();

    setConversations((prev) => [newChat, ...prev]);
    setCurrentChatId(newChat.id);
    setEditingChatId(null);
    setEditedTitle("");
    setSearchTerm("");
    setMessage("");
    clearSelectedFiles();
  };

  const selectChat = (chatId) => {
    setCurrentChatId(chatId);
    setEditingChatId(null);
    setEditedTitle("");
    setMessage("");
    clearSelectedFiles();
  };

  const renameChat = (chatId) => {
    const newTitle = editedTitle.trim();

    if (!newTitle) {
      setEditingChatId(null);
      setEditedTitle("");
      return;
    }

    setConversations((prevChats) =>
      prevChats.map((chat) =>
        chat.id === chatId
          ? {
              ...chat,
              title: newTitle,
              updatedAt: Date.now(),
            }
          : chat
      )
    );

    setEditingChatId(null);
    setEditedTitle("");
  };

  const deleteChat = (chatId) => {
    const updatedChats = conversations.filter((chat) => chat.id !== chatId);

    if (updatedChats.length === 0) {
      const defaultChat = createDefaultChat();
      setConversations([defaultChat]);
      setCurrentChatId(defaultChat.id);
      setEditingChatId(null);
      setEditedTitle("");
      setMessage("");
      clearSelectedFiles();
      return;
    }

    const nextChat = sortConversationsByRecent(updatedChats)[0];

    setConversations(updatedChats);

    if (currentChatId === chatId) {
      setCurrentChatId(nextChat.id);
    }

    setEditingChatId(null);
    setEditedTitle("");
    setMessage("");
    clearSelectedFiles();
  };

  const clearMessages = (chatId) => {
    const confirmed = window.confirm("Clear all messages in this chat?");
    if (!confirmed) return;

    setConversations((prev) =>
      prev.map((chat) =>
        chat.id === chatId
          ? {
              ...chat,
              messages: [],
              updatedAt: Date.now(),
            }
          : chat
      )
    );
  };

  const exportChat = () => {
    if (!messages.length || !currentConversation) {
      alert("No messages to export.");
      return;
    }

    let content = "";

    messages.forEach((msg) => {
      content += `${msg.sender.toUpperCase()}:\n`;
      content += `${msg.text}\n`;

      if (Array.isArray(msg.attachments) && msg.attachments.length > 0) {
        content += `Attachments: ${msg.attachments
          .map((a) => a.name)
          .join(", ")}\n`;
      }

      content += "\n----------------------------------\n\n";
    });

    const blob = new Blob([content], { type: "text/plain" });
    const url = window.URL.createObjectURL(blob);

    const a = document.createElement("a");
    a.href = url;

    const safeTitle = (currentConversation.title || "chat")
      .replace(/[\\/:*?"<>|]/g, "")
      .trim();

    a.download = `${safeTitle || "chat"}.txt`;
    a.click();

    window.URL.revokeObjectURL(url);
  };

  const handleAttachClick = () => {
    fileInputRef.current?.click();
  };

  const removeSelectedFile = (indexToRemove) => {
    setSelectedFiles((prev) => prev.filter((_, index) => index !== indexToRemove));
  };

  const handleFileChange = async (event) => {
    const pickedFiles = Array.from(event.target.files || []);
    if (pickedFiles.length === 0) return;

    const accepted = [];

    for (const file of pickedFiles) {
      if (!isSupportedAttachment(file)) {
        alert(`Unsupported file type: ${file.name}`);
        continue;
      }

      if (isAudioOrVideo(file)) {
        try {
          const duration = await getMediaDuration(file);
          if (duration > 20) {
            alert(`${file.name} is longer than 20 seconds and was not added.`);
            continue;
          }
        } catch {
          alert(`Could not verify duration for ${file.name}.`);
          continue;
        }
      }

      accepted.push(file);
    }

    if (accepted.length > 0) {
      setSelectedFiles((prev) => [...prev, ...accepted]);
    }

    event.target.value = "";
  };

  const stopGeneration = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    setLoading(false);
  };

  const sendMessage = async () => {
    if (loading) return;

    const cleanMessage = message.trim();
    if (!cleanMessage && selectedFiles.length === 0) {
      return;
    }

    const attachmentMeta = selectedFiles.map((file) => ({
      name: file.name,
      type: file.type,
      size: file.size,
    }));

    const messageText =
      cleanMessage || buildAttachmentSummary(selectedFiles) || "Attached files";

    const chatTitleSource =
      cleanMessage || buildAttachmentTitle(selectedFiles) || "New Chat";

    const activeChatId = currentConversation ? currentConversation.id : createId();

    const userMessage = {
      sender: "user",
      text: messageText,
      attachments: attachmentMeta,
    };

    const updatedMessages = [...messages, userMessage];

    if (!currentConversation) {
      const newChat = {
        id: activeChatId,
        title: buildSmartChatTitle(chatTitleSource),
        messages: [userMessage],
        updatedAt: Date.now(),
      };

      setConversations((prev) => [newChat, ...prev]);
      setCurrentChatId(activeChatId);
    } else {
      setConversations((prev) =>
        prev.map((chat) =>
          chat.id === activeChatId
            ? {
                ...chat,
                title:
                  chat.messages.length === 0
                    ? buildSmartChatTitle(chatTitleSource)
                    : chat.title,
                messages: updatedMessages,
                updatedAt: Date.now(),
              }
            : chat
        )
      );
    }

    setMessage("");

    const filesToUpload = selectedFiles;

    try {
      setLoading(true);

      const controller = new AbortController();
      abortControllerRef.current = controller;

      const formattedMessages = updatedMessages.map((msg) => ({
        role: msg.sender === "user" ? "user" : "model",
        content: msg.text,
      }));

      let res;

      if (filesToUpload.length > 0) {
        const formData = new FormData();
        formData.append("message", messageText);
        formData.append("chatId", String(activeChatId));
        formData.append("messages", JSON.stringify(formattedMessages));

        filesToUpload.forEach((file) => {
          formData.append("files", file);
        });

        res = await axios.post("http://127.0.0.1:8000/chat", formData, {
          signal: controller.signal,
        });
      } else {
        res = await axios.post(
          "http://127.0.0.1:8000/chat",
          {
            messages: formattedMessages,
          },
          {
            signal: controller.signal,
          }
        );
      }

      const responseText =
        typeof res.data?.reply === "string" ? res.data.reply : "";

      const responseTitle =
        typeof res.data?.title === "string" && res.data.title.trim()
          ? res.data.title.trim()
          : "";

      const botMessage = {
        sender: "bot",
        text: responseText || " ",
      };

      setConversations((prev) =>
        prev.map((chat) =>
          chat.id === activeChatId
            ? {
                ...chat,
                title: responseTitle || chat.title,
                messages: [...chat.messages, botMessage],
                updatedAt: Date.now(),
              }
            : chat
        )
      );

      clearSelectedFiles();
    } catch (error) {
      const isCanceled =
        error?.code === "ERR_CANCELED" ||
        error?.name === "CanceledError" ||
        axios.isCancel?.(error);

      if (isCanceled) {
        return;
      }

      console.error(error);

      const errorMessage = {
        sender: "bot",
        text: "⚠️ Error connecting to backend",
      };

      setConversations((prev) =>
        prev.map((chat) =>
          chat.id === activeChatId
            ? {
                ...chat,
                messages: [...chat.messages, errorMessage],
                updatedAt: Date.now(),
              }
            : chat
        )
      );
    } finally {
      if (abortControllerRef.current) {
        abortControllerRef.current = null;
      }
      setLoading(false);
    }
  };

  const renderSelectedFiles = () => {
    if (selectedFiles.length === 0) return null;

    return (
      <div style={{ marginBottom: "12px" }}>
        {selectedFiles.map((file, index) => (
          <div
            className="file-preview"
            key={`${file.name}-${file.size}-${index}`}
          >
            <div className="file-meta">
              <div className="file-name">{file.name}</div>
              <div className="file-size">{formatFileSize(file.size)}</div>
            </div>

            <button
              type="button"
              className="remove-file-btn"
              onClick={() => removeSelectedFile(index)}
              aria-label={`Remove ${file.name}`}
            >
              ✕
            </button>
          </div>
        ))}
      </div>
    );
  };

  return (
    <div className={darkMode ? "app dark-mode" : "app"}>
      <div className="sidebar">
        <button className="new-chat-btn" onClick={createNewChat} type="button">
          + New Chat
        </button>

        <input
          type="text"
          placeholder="Search chats..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="search-box"
        />

        <div style={recentChatsStyle}>Recent Chats</div>

        <div className="chat-list">
          {filteredConversations.length > 0 ? (
            filteredConversations.map((chat) => (
              <div
                key={chat.id}
                className={
                  currentChatId === chat.id ? "chat-item active-chat" : "chat-item"
                }
              >
                {editingChatId === chat.id ? (
                  <input
                    className="rename-input"
                    value={editedTitle}
                    onChange={(e) => setEditedTitle(e.target.value)}
                    onBlur={() => renameChat(chat.id)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        renameChat(chat.id);
                      }
                      if (e.key === "Escape") {
                        setEditingChatId(null);
                        setEditedTitle("");
                      }
                    }}
                    autoFocus
                  />
                ) : (
                  <>
                    <span
                      className="chat-title"
                      onClick={() => selectChat(chat.id)}
                    >
                      {chat.title}
                    </span>

                    <div className="chat-actions">
                      <button
                        className="edit-btn"
                        onClick={(e) => {
                          e.stopPropagation();
                          setEditingChatId(chat.id);
                          setEditedTitle(chat.title);
                        }}
                        type="button"
                        aria-label="Rename chat"
                      >
                        ✏️
                      </button>

                      <button
                        className="delete-btn"
                        onClick={(e) => {
                          e.stopPropagation();
                          deleteChat(chat.id);
                        }}
                        type="button"
                        aria-label="Delete chat"
                      >
                        🗑
                      </button>
                    </div>
                  </>
                )}
              </div>
            ))
          ) : (
            <div className="no-chats">No chats found</div>
          )}
        </div>
      </div>

      <div
        className={
          showWelcome
            ? "main-content main-content--welcome"
            : "main-content main-content--conversation"
        }
      >
        <div className="theme-toggle">
          <button
            className="theme-btn"
            onClick={() => setDarkMode((prev) => !prev)}
            type="button"
          >
            {darkMode ? "☀️ Light Mode" : "🌙 Dark Mode"}
          </button>
        </div>

        <h1
          className={
            showWelcome ? "title title--hero" : "title title--compact"
          }
        >
          Student Sphere AI
        </h1>

        <div
          className={
            showWelcome
              ? "chat-container chat-container--welcome"
              : "chat-container chat-container--conversation"
          }
        >
          {showWelcome ? (
            <div className="welcome-panel">
              <p className="welcome-text">Ask something to start a new chat</p>

              {renderSelectedFiles()}

              <div className="input-section input-section--welcome">
                <div className="input-tools" style={{ flex: 1, minWidth: 0 }}>
                  <button
                    type="button"
                    className="attach-btn"
                    onClick={handleAttachClick}
                    disabled={loading}
                    aria-label="Attach files"
                  >
                    📎
                  </button>

                  <input
                    type="file"
                    ref={fileInputRef}
                    hidden
                    multiple
                    accept=".pdf,.doc,.docx,.txt,image/*,audio/*,video/*"
                    onChange={handleFileChange}
                  />

                  <input
                    type="text"
                    placeholder="Ask something..."
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        sendMessage();
                      }
                    }}
                    className="input-box"
                  />
                </div>

                {loading ? (
                  <button
                    onClick={stopGeneration}
                    className="stop-btn"
                    type="button"
                  >
                    ⏹ Stop
                  </button>
                ) : (
                  <button
                    onClick={sendMessage}
                    className="send-btn"
                    type="button"
                  >
                    Send
                  </button>
                )}
              </div>
            </div>
          ) : (
            <>
              <div className="top-actions">
                <button
                  className="clear-btn"
                  onClick={() => clearMessages(currentChatId)}
                  type="button"
                >
                  🗑 Clear Messages
                </button>

                <button className="export-btn" onClick={exportChat} type="button">
                  📄 Export Chat
                </button>
              </div>

              <div className="response-box">
                {messages.map((msg, index) => {
                  const isLastMessage = index === messages.length - 1;

                  return (
                    <div
                      key={index}
                      ref={isLastMessage ? latestMessageRef : null}
                      className={
                        msg.sender === "user" ? "user-message" : "bot-message"
                      }
                    >
                      <ReactMarkdown>{msg.text}</ReactMarkdown>

                      {Array.isArray(msg.attachments) &&
                        msg.attachments.length > 0 && (
                          <div
                            style={{
                              display: "flex",
                              flexWrap: "wrap",
                              gap: "6px",
                              marginTop: "10px",
                            }}
                          >
                            {msg.attachments.map((att, attIndex) => (
                              <span
                                key={`${att.name}-${attIndex}`}
                                style={{
                                  padding: "4px 8px",
                                  borderRadius: "999px",
                                  fontSize: "12px",
                                  background:
                                    msg.sender === "user"
                                      ? "rgba(255,255,255,0.14)"
                                      : "rgba(0,0,0,0.05)",
                                  color: "inherit",
                                  border:
                                    msg.sender === "user"
                                      ? "1px solid rgba(255,255,255,0.15)"
                                      : "1px solid rgba(0,0,0,0.08)",
                                }}
                              >
                                📎 {att.name}
                              </span>
                            ))}
                          </div>
                        )}
                    </div>
                  );
                })}

                {loading && (
                  <div className="bot-message" ref={typingIndicatorRef}>
                    <div className="typing-indicator">
                      <span></span>
                      <span></span>
                      <span></span>
                    </div>
                  </div>
                )}
              </div>

              {renderSelectedFiles()}

              <div className="input-section input-section--sticky">
                <div className="input-tools" style={{ flex: 1, minWidth: 0 }}>
                  <button
                    type="button"
                    className="attach-btn"
                    onClick={handleAttachClick}
                    disabled={loading}
                    aria-label="Attach files"
                  >
                    📎
                  </button>

                  <input
                    type="file"
                    ref={fileInputRef}
                    hidden
                    multiple
                    accept=".pdf,.doc,.docx,.txt,image/*,audio/*,video/*"
                    onChange={handleFileChange}
                  />

                  <input
                    type="text"
                    placeholder="Ask something..."
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        sendMessage();
                      }
                    }}
                    className="input-box"
                  />
                </div>

                {loading ? (
                  <button
                    onClick={stopGeneration}
                    className="stop-btn"
                    type="button"
                  >
                    ⏹ Stop
                  </button>
                ) : (
                  <button
                    onClick={sendMessage}
                    className="send-btn"
                    type="button"
                  >
                    Send
                  </button>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default App;