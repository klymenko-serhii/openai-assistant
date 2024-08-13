"use client";

import React, { useState, useEffect, useRef } from "react";
import { AssistantStream } from "openai/lib/AssistantStream";
import Markdown from "react-markdown";

type MessageProps = {
  role: "user" | "assistant" | "code";
  text: string;
};

const UserMessage = ({ text }: { text: string }) => {
  return (
    <div className="bg-black text-white ml-auto p-2 w-fit rounded-md">
      {text}
    </div>
  );
};

const AssistantMessage = ({ text }: { text: string }) => {
  return (
    <div className="bg-gray-300 p-2 w-fit rounded-md">
      <Markdown>{text}</Markdown>
    </div>
  );
};

const Message = ({ role, text }: MessageProps) => {
  switch (role) {
    case "user":
      return <UserMessage text={text} />;
    case "assistant":
      return <AssistantMessage text={text} />;
    default:
      return null;
  }
};

type ChatProps = {
  onReceiveAvailabilities: (availabilities) => void;
};

const Chat = ({ onReceiveAvailabilities }: ChatProps) => {
  const [userInput, setUserInput] = useState("");
  const [messages, setMessages] = useState([]);
  const [inputDisabled, setInputDisabled] = useState(false);
  const [threadId, setThreadId] = useState("");
  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };
  useEffect(() => {
    scrollToBottom();
  }, [messages]);
  useEffect(() => {
    const createThread = async () => {
      const res = await fetch(`/api/assistants/threads`, {
        method: "POST",
      });
      const data = await res.json();
      setThreadId(data.threadId);
    };
    createThread();
  }, []);

  const sendMessage = async (text) => {
    const response = await fetch(
      `/api/assistants/threads/${threadId}/messages`,
      {
        method: "POST",
        body: JSON.stringify({
          content: text,
        }),
      }
    );

    const stream = AssistantStream.fromReadableStream(response.body);
    stream.on("textCreated", () => {
      setMessages((prevMessages) => [
        ...prevMessages,
        { role: "assistant", text: "" },
      ]);
    });
    stream.on("textDelta", (event) => {
      setMessages((prevMessages) => {
        const lastMessage = prevMessages[prevMessages.length - 1];
        const updatedLastMessage = {
          ...lastMessage,
          text: lastMessage.text + event.value,
        };
        return [...prevMessages.slice(0, -1), updatedLastMessage];
      });
    });
    stream.on("event", (event) => {
      console.log("event", event);
      if (event.event === "thread.run.completed") setInputDisabled(false);
      // @ts-ignore
      if (event.event === "search_availability")
        // @ts-ignore
        onReceiveAvailabilities(event.data);
    });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!userInput.trim()) return;
    sendMessage(userInput);
    setMessages((prevMessages) => [
      ...prevMessages,
      { role: "user", text: userInput },
    ]);
    setUserInput("");
    setInputDisabled(true);
    scrollToBottom();
  };

  return (
    <div className="h-screen flex flex-col p-6 gap-4 flex-1">
      <div className="flex flex-col gap-3 flex-1 p-4 border border-gray-400 rounded-md shadow-md overflow-y-auto">
        {messages.map((msg, index) => (
          <Message key={index} role={msg.role} text={msg.text} />
        ))}
        <div ref={messagesEndRef} />
      </div>
      <form onSubmit={handleSubmit} className="flex gap-4 h-9">
        <input
          type="text"
          className="border border-gray-400 rounded-md flex-1 p-1 shadow-md"
          value={userInput}
          onChange={(e) => setUserInput(e.target.value)}
          placeholder="Enter your question"
        />
        <button
          type="submit"
          className="bg-slate-800 text-white rounded-md w-16 disabled:bg-gray-400 shadow-md"
          disabled={inputDisabled}
        >
          Send
        </button>
      </form>
    </div>
  );
};

export default Chat;
