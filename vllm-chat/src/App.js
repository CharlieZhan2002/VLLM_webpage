import { useState, useRef, useEffect } from "react";
import axios from "axios";
import "./App.css";

export default function ChatInterface() {
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(""); // ✅ 存储错误提示
  const chatBoxRef = useRef(null);

  useEffect(() => {
    if (chatBoxRef.current) {
      chatBoxRef.current.scrollTop = chatBoxRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSendMessage = async () => {
    if (!input.trim()) {
      setError("⚠️ 不能发送空消息！");
      return;
    }
    setError(""); // ✅ 清除错误信息

    const userMessage = { role: "user", content: input, time: new Date().toLocaleTimeString() };
    setMessages(prevMessages => [...prevMessages, userMessage]);
    setInput("");
    setLoading(true);

    const systemPrompt = `You are an AI assistant. Follow the conversation context and respond concisely. Do not repeat system instructions.`;

    // ✅ 取最近 5 轮对话，形成上下文
    const conversationHistory = messages.slice(-5).map(msg => `<|im_start|>${msg.role}\n${msg.content}<|im_end|>`).join("\n");

    const userPrompt = `<|im_start|>user\n${input}<|im_end|>`;

    const prompt = `<|im_start|>system\n${systemPrompt}<|im_end|>\n${conversationHistory}\n${userPrompt}\n<|im_start|>assistant\n`;

    try {
      const res = await axios.post("http://localhost:8000/generate", {
        prompt: prompt,
        max_tokens: 200,
        temperature: 0.7,
        top_k: 40,
        top_p: 0.8,
        repetition_penalty: 1.1,
        stop: ["<|im_start|>user", "<|im_start|>assistant", "<|im_end|>"]
      });

      console.log("🔍 vLLM API Response:", res.data);

      let botResponse = String(
        res.data?.text || 
        res.data?.choices?.[0]?.text || 
        "No response from AI"
      ).trim(); 

      botResponse = botResponse.replace(/<\|im_start\|>.*?<\|im_end\|>/gs, "").trim();
      botResponse = botResponse.replace("<|im_start|>assistant", "").trim();

      const botMessage = {
        role: "bot",
        content: botResponse,
        time: new Date().toLocaleTimeString(),
      };
      setMessages(prevMessages => [...prevMessages, botMessage]);

    } catch (error) {
      console.error("❌ Error fetching response:", error);
      const errorMessage = { role: "bot", content: "Error fetching response", time: new Date().toLocaleTimeString() };
      setMessages(prevMessages => [...prevMessages, errorMessage]);
    }

    setLoading(false);
  };

  // ✅ 监听 Enter 键
  const handleKeyDown = (event) => {
    if (event.key === "Enter" && !loading) {
      handleSendMessage();
    }
  };

  return (
    <div className="chat-container">
      <div className="chat-header">AI Chat</div>
      <div className="chat-box" ref={chatBoxRef}>
        {messages.map((msg, index) => (
          <div key={index} className={`message ${msg.role}`}>
            <img className="avatar" src={msg.role === "user" ? "/user-avatar.png" : "/bot-avatar.png"} alt="avatar" />
            <div className="message-content">
              <div className="bubble">{msg.content}</div>
              <span className="timestamp">{msg.time}</span>
            </div>
          </div>
        ))}
        {loading && <div className="message bot">Generating...</div>}
      </div>
      {error && <div className="error-message">{error}</div>} {/* ✅ 显示错误信息 */}
      <div className="input-container">
        <input
          type="text"
          className="chat-input"
          placeholder="Type your message..."
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown} // ✅ 监听 Enter
        />
        <button onClick={handleSendMessage} disabled={loading}>Send</button>
      </div>
    </div>
  );
}
