import { ExpressEndPoint } from "../types";
import { getAuthTokenEndpoint } from "./get-auth-token";
import { createChatSessionEndpoint } from "./chat/create-chat-session";
import { sendMessageEndpoint } from "./chat/send-message";

export const endpoints: ExpressEndPoint[] = [
    sendMessageEndpoint,
    createChatSessionEndpoint,
    getAuthTokenEndpoint
];