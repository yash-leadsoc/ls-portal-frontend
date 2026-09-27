import { useEffect, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { api } from '../api/client';
import DeveloperCard from './DeveloperCard';
import ReactMarkdown from 'react-markdown';

const QUICK_QUESTIONS = [
    'What can I do in this portal?',
    'How does the training process work?',
    'What is my training progress?',
    'Do I have any upcoming interviews?',
];

export default function PortalAssistant() {
    const { user } = useAuth();
    const location = useLocation();

    const [open, setOpen] = useState(false);
    const [message, setMessage] = useState('');
    const [messages, setMessages] = useState([]);
    const [loading, setLoading] = useState(false);

    const bottomRef = useRef(null);

    useEffect(() => {
        if (!open) return;

        bottomRef.current?.scrollIntoView({
            behavior: 'smooth',
        });
    }, [messages, open]);

    useEffect(() => {
        if (open && messages.length === 0) {
            setMessages([
                {
                    role: 'assistant',
                    content: `Hi ${user?.name?.split(' ')[0] || 'there'} 👋

I'm your Portal Assistant. How can I help you today?

You can ask me about training, interviews, bench, checklists, or your progress.`,
                },
            ]);
        }
    }, [open, user?.name, messages.length]);

    const sendMessage = async (text = message) => {
        const value = text.trim();

        if (!value || loading) return;

        const oldMessages = messages;

        setMessage('');

        setMessages((prev) => [
            ...prev,
            {
                role: 'user',
                content: value,
            },
        ]);

        setLoading(true);

        try {
            let progress = null;

            if (user?.role === 'employee') {
                try {
                    progress = await api.myProgress();
                } catch (e) {
                }
            }

            const response = await api.assistantChat(
                value,
                oldMessages.slice(-10),
                {
                    currentPage: location.pathname,
                    progress,
                }
            );

            if (response.type === 'developer') {
                setMessages((prev) => [
                    ...prev,
                    {
                        role: 'assistant',
                        type: 'developer',
                        developer: response.developer,
                    },
                ]);
            }

            else {
                setMessages((prev) => [
                    ...prev,
                    {
                        role: 'assistant',
                        content:
                            response.answer ||
                            "I couldn't find enough information to answer that.",
                    },
                ]);
            }
        } catch (error) {
            setMessages((prev) => [
                ...prev,
                {
                    role: 'assistant',
                    content:
                        "I'm sorry, I couldn't connect to the portal assistant right now. Please try again or contact your trainer, manager, or portal administrator.",
                },
            ]);
        } finally {
            setLoading(false);
        }
    };

    const handleKeyDown = (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            sendMessage();
        }
    };

    if (!user) return null;

    return (
        <>
            {open && (
                <div className="portal-assistant-panel">

                    <div className="portal-assistant-header">
                        <div className="portal-assistant-title">
                            <div className="portal-ai-icon">
                                ✦
                            </div>

                            <div>
                                <div className="portal-ai-name">
                                    Portal Assistant
                                </div>

                                <div className="portal-ai-status">
                                    <span />
                                    Online
                                </div>
                            </div>
                        </div>

                        <button
                            className="portal-assistant-close"
                            onClick={() => setOpen(false)}
                            aria-label="Close assistant"
                        >
                            ×
                        </button>
                    </div>

                    <div className="portal-assistant-messages">

                        {messages.map((item, index) => (
                            <div
                                key={index}
                                className={`portal-message ${item.role === 'user'
                                    ? 'portal-message-user'
                                    : 'portal-message-ai'
                                    }`}
                            >

                                {item.role === 'assistant' && (
                                    <div className="portal-message-avatar">
                                        ✦
                                    </div>
                                )}

                                <div className="portal-message-content">
                                    {item.type === 'developer' ? (
                                        <DeveloperCard developer={item.developer} />
                                    ) : (
                                        <ReactMarkdown>
                                            {item.content}
                                        </ReactMarkdown>
                                    )}
                                </div>
                            </div>
                        ))}

                        {messages.length === 1 && (
                            <div className="portal-quick-actions">
                                <div className="portal-quick-title">
                                    Try asking
                                </div>

                                {QUICK_QUESTIONS.map((question) => (
                                    <button
                                        key={question}
                                        onClick={() =>
                                            sendMessage(question)
                                        }
                                    >
                                        {question}
                                    </button>
                                ))}
                            </div>
                        )}

                        {loading && (
                            <div className="portal-message portal-message-ai">

                                <div className="portal-message-avatar">
                                    ✦
                                </div>

                                <div className="portal-typing">
                                    <span />
                                    <span />
                                    <span />
                                </div>

                            </div>
                        )}

                        <div ref={bottomRef} />
                    </div>

                    <div className="portal-assistant-input-area">

                        <textarea
                            value={message}
                            onChange={(e) =>
                                setMessage(e.target.value)
                            }
                            onKeyDown={handleKeyDown}
                            placeholder="Ask about training, interviews..."
                            rows={1}
                            disabled={loading}
                        />

                        <button
                            className="portal-send-button"
                            onClick={() => sendMessage()}
                            disabled={
                                !message.trim() || loading
                            }
                        >
                            ↑
                        </button>

                    </div>

                    <div className="portal-assistant-footer">
                        AI can make mistakes. Verify important information.
                    </div>

                </div>
            )}

            {!open && (
                <button
                    className="portal-assistant-fab"
                    onClick={() => setOpen(true)}
                    aria-label="Open Portal Assistant"
                >
                    <span className="portal-fab-glow" />
                    <span className="portal-fab-icon">
                        ✦
                    </span>
                </button>
            )}
        </>
    );
}
