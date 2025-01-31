import React, { useEffect, useState, useRef, useMemo } from 'react';
import socketIOClient from "socket.io-client";
import ChatBoxReciever, { ChatBoxSender } from './ChatBox';
import InputText from './InputText';
import UserLogin from './UserLogin';
import {
    doc,
    setDoc,
    collection,
    serverTimestamp,
    query,
    onSnapshot,
    orderBy,
} from 'firebase/firestore';
import db from "./firebaseConfig/firebaseConfig.js";

export default function ChatContainer() {
    const socketio = useMemo(() => socketIOClient("https://s22s-3.onrender.com"), []);
    const [chats, setChats] = useState([]);
    const [user, setUser] = useState(localStorage.getItem("user"));
    const avatar = localStorage.getItem('avatar');
    const chatsRef = collection(db, "Messages");
    const messagesEndRef = useRef(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(() => {
        scrollToBottom();
    }, [chats]);

    useEffect(() => {
        socketio.on('chat', (senderChats) => {
            setChats(senderChats);
        });

        return () => {
            socketio.disconnect(); // Clean up socket connection
        };
    }, [socketio]);

    useEffect(() => {
        const q = query(chatsRef, orderBy('createdAt', 'asc'));

        const unsub = onSnapshot(q, (querySnapshot) => {
            const fireChats = [];
            querySnapshot.forEach(doc => {
                fireChats.push(doc.data());
            });
            setChats([...fireChats]);
        });

        return () => {
            unsub(); // Unsubscribe from Firestore updates
        };
    }, [chatsRef]);

    function addToFirebase(chat) {
        const newChat = {
            avatar,
            createdAt: serverTimestamp(),
            user,
            message: chat.message,
        };

        const chatRef = doc(chatsRef);
        setDoc(chatRef, newChat)
            .then(() => console.log('Chat added successfully'))
            .catch(console.error);
    }

    function sendChatToSocket(chat) {
        socketio.emit("chat", chat);
    }

    function addMessage(chat) {
        const newChat = { ...chat, user: localStorage.getItem("user"), avatar };
        addToFirebase(chat);
        setChats([...chats, newChat]);
        sendChatToSocket([...chats, newChat]);
    }

    function logout() {
        localStorage.removeItem("user");
        localStorage.removeItem("avatar");
        setUser("");
    }

    const ChatsList = React.memo(() => (
        <div style={{ height: '75vh', overflow: 'scroll', overflowX: 'hidden' }}>
            {chats.map((chat, index) => (
                chat.user === user
                    ? <ChatBoxSender key={index} message={chat.message} avatar={chat.avatar} user={chat.user} />
                    : <ChatBoxReciever key={index} message={chat.message} avatar={chat.avatar} user={chat.user} />
            ))}
            <div ref={messagesEndRef} />
        </div>
    ));

    return (
        <div>
            {user ? (
                <div>
                    <div style={{ display: 'flex', flexDirection: "row", justifyContent: 'space-between' }}>
                        <h4>Username: {user}</h4>
                        <p onClick={logout} style={{ color: "blue", cursor: 'pointer' }}>Log Out</p>
                    </div>
                    <ChatsList />
                    <InputText addMessage={addMessage} />
                </div>
            ) : (
                <UserLogin setUser={setUser} />
            )}

            <div style={{ margin: 10, display: 'flex', justifyContent: 'center' }}>
                <small style={{ backgroundColor: 'lightblue', padding: 5, borderRadius: 5 }}>
                    Interested in some 1 on 1 Coding Tutorials and Mentorship? Let's chat on Discord: <strong>kutlo_sek#5370</strong>
                </small>
            </div>
        </div>
    );
}
