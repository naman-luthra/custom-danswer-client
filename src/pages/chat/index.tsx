import React, { useState, useEffect, use } from 'react';
import { createChatSession, SendMessageResponse, simpleSendMessage } from '../../utils/danswer/chatApi';
import { GiBrain } from "react-icons/gi";
import Markdown from 'react-markdown';

interface ContextDoc {
  link: string;
  matchHighlights: string[];
  score: number;
  title: string;
  citation?: number;
}
interface Message {
  sender: 'user' | 'bot';
  content: string;
  messageId: string | null;
  contextDocs: ContextDoc[];
}

const Chat: React.FC = () => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [chatSessionId, setChatSessionId] = useState<string | null>(null);
  const [input, setInput] = useState('');

  // Stores ongoing responses
  const [accumulatedResponse, setAccumulatedResponse] = useState<{
    content: string,
    responding: boolean,
    messageId: string | null,
    contextDocs: ContextDoc[]
  }>({
    content: '',
    responding: false,
    messageId: null,
    contextDocs: []
  });

  const [ lastBotMessageId, setLastBotMessageId ] = useState<string | null>(null);

  // Creation of the chat session
  useEffect(() => {
    createChatSession(1)
      .then(sessionId => {
        setChatSessionId(sessionId);
        console.log('Chat session created with ID:', sessionId);
      })
      .catch(error => console.error('Failed to create chat session:', error));
  }, []);

  // Send message handler
  const handleSendMessage = () => {
    if (!input.trim() || !chatSessionId) return;

    setMessages(messages => [...messages, { sender: 'user', content: input, messageId: null, contextDocs: [] }]);

    // Reset for new response
    setAccumulatedResponse({
      content: '',
      responding: true,
      messageId: null,
      contextDocs: []
    });

    console.log('Sending message:', input);

    simpleSendMessage({
      chat_session_id: chatSessionId,
      message: input,
      prompt_id: 5,
      temperature: 0.5,
      parent_message_id: lastBotMessageId
    }, onData, onEnd, onError);

    setInput(''); // Clear input field
  };

  const onData = (response: SendMessageResponse) => {
    const userMessageId = response.user_message_id;
    console.log('Received message:', response);
    if(userMessageId){
      setMessages(messages => messages.map(msg => {
        if(msg.messageId === null) return { ...msg, messageId: userMessageId };
        return msg;
      }));
    }
    const messageId = response.message_id;
    if(messageId){
      setAccumulatedResponse(prev => ({
        ...prev,
        responding: true,
        messageId: messageId
      }));
    }
    const message = response.message;
    if(message){
      setAccumulatedResponse(prev => ({
        ...prev,
        content: message,
        responding: true
      }));
    }

    const contextDocs = response.context_docs;
    if(contextDocs){
      const citations = response.citations || {};
      const citationsMap = new Map();
      Object.entries(citations).forEach(([key, value]) => {
        citationsMap.set(value, key);
      });
      setAccumulatedResponse(prev => ({
        ...prev,
        contextDocs: contextDocs.top_documents.map(doc => ({
          link: doc.link,
          matchHighlights: 
            doc
              .match_highlights
              .map(highlight => highlight.trim())
              .filter(highlight => highlight.length > 0),
          score: doc.score,
          title: doc.semantic_identifier,
          citation: citationsMap.get(doc.db_doc_id) || undefined
        }))
      }));
    }

    const answerPiece = response.answer_piece;
    if(answerPiece){
      setAccumulatedResponse(prev => ({
          ...prev,
          content: prev.content + answerPiece,
          responding: true
      }));
    }
  };

  const onEnd = () => {
    setAccumulatedResponse(prev => ({
      ...prev,
      content: prev.content,
      responding: false
    }));
  };

  const onError = (error: any) => {
    setAccumulatedResponse(prev => ({
      ...prev,
      content: prev.content,
      responding: false
    }));
    console.error('Error during message sending:', error);
  };

  // Input change handler
  const handleInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setInput(event.target.value);
  };

  // Key press handler
  const handleKeyPress = (event: React.KeyboardEvent) => {
    if (event.key === 'Enter') handleSendMessage();
  };

  useEffect(() => {
    if (!accumulatedResponse.responding && accumulatedResponse.content) {
      setMessages(messages => [
          ...messages,
          { 
            sender: 'bot',
            content: accumulatedResponse.content,
            messageId: accumulatedResponse.messageId,
            contextDocs: accumulatedResponse.contextDocs
          }
        ]
      );
    }
  }, [accumulatedResponse]);

  useEffect(() => {
    if(messages.length > 0){
      const lastBotMessage = messages.findLast(({sender}) => sender === 'bot');
      if(lastBotMessage){
        setLastBotMessageId(lastBotMessage.messageId);
      }
    }
  }, [messages]);

  const scrollDivRef = React.useRef<HTMLDivElement>(null);

  useEffect(() => {
    if(scrollDivRef.current){
      scrollDivRef.current.scrollTop = scrollDivRef.current.scrollHeight;
    }
  }, [messages, accumulatedResponse]);

  return (
    <div className="flex flex-col h-screen py-12 mx-auto">
      <div ref={scrollDivRef} className="flex-grow overflow-y-auto p-4 px-[20%] space-y-6">
        {messages.map((msg, index) => (
          <div key={index} className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className='flex gap-2 max-w-[60%]'>
              {
                msg.sender === 'bot' && (
                  <div className='w-8 h-8 mt-2'>
                    <GiBrain className='w-8 h-8'/>
                  </div>
                )
              }
              <div>
                <div className={`p-2 rounded-lg ${msg.sender === 'user' ? 'bg-gray-100 text-black' : ''}`}>
                  <Markdown>
                    {msg.content}
                  </Markdown>
                </div>
                {
                  msg.contextDocs.length > 0 && (
                    <div className="flex gap-4 overflow-x-scroll">
                      {msg.contextDocs.map((doc, index) => (
                        <a key={index} href={doc.link} target="_blank" rel="noreferrer" className="p-2 bg-gray-50 rounded-lg shadow-md my-2 max-w-[36%]">
                          <div className="text-blue-500 text-sm">
                            <span>{doc.title}</span>
                            {doc.citation && <span>{` [${doc.citation}]`}</span>}
                          </div>
                          <div className="text-ellipsis overflow-hidden text-xs">{doc.link}</div>
                          {
                            doc.matchHighlights.length > 0 &&
                              <div key={index} className="text-xs text-gray-500">{doc.matchHighlights.join("...").slice(0, 128)}...</div>
                          }
                        </a>
                      ))}
                    </div>
                  )
                }
              </div>
            </div>
          </div>
        ))}
        {
          messages.length === 0 && (
            <div className="flex flex-col gap-4 h-full w-full items-center justify-center text-xl">
                <GiBrain className='text-4xl'/>
                <div>Welcome to the chat! Ask me anything.</div>
            </div>
          )
        }
        {accumulatedResponse.responding && (
          <div className='flex justify-start'>
            <div className='flex gap-2 max-w-[60%]'>
              <div className='w-8 h-8 mt-2'>
                <GiBrain className='w-8 h-8'/>
              </div>
              <div>
                <div className={`p-2 rounded-lg`}>
                  { accumulatedResponse.content ? <Markdown>{accumulatedResponse.content}</Markdown> : "Thinking..."}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
      <div className="flex p-4 px-[20%]">
        <input
          type="text"
          value={input}
          onChange={handleInputChange}
          onKeyPress={handleKeyPress}
          placeholder="Type your message here..."
          className="flex-grow border-2 border-gray-300 p-2 rounded-lg focus:outline-none focus:border-blue-500"
        />
        <button
          onClick={handleSendMessage}
          className="ml-4 px-6 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 focus:outline-none"
        >
          Send
        </button>
      </div>
    </div>
  );
};

export default Chat;