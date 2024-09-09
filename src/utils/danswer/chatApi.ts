// chatApi.ts in the /utils or /lib directory

import { PacketType } from './interfaces';
import { handleSSEStream } from './streamingUtils';

interface ChatSessionResponse {
    chat_session_id: string;
}

interface ContextDocument {
    top_documents: TopDocument[];
}

interface TopDocument {
    document_id: string;
    chunk_ind: number;
    semantic_identifier: string;
    link: string;
    blurb: string;
    source_type: string;
    boost: number;
    hidden: boolean;
    metadata: Metadata;
    score: number;
    is_relevant: boolean | null;
    relevance_explanation: string | null;
    match_highlights: string[];
    updated_at: string | null;
    primary_owners: string[] | null;
    secondary_owners: string[] | null;
    is_internet: boolean;
    db_doc_id: number;
}

interface Metadata {
// Define properties based on actual metadata keys if available
}

interface SendMessageParams {
    chat_session_id: string;
    message: string;
    prompt_id: number;
    temperature: number;
    parent_message_id: string | null;
    fastapiusersauth: string | null;
}

export interface SendMessageResponse {
    answer_piece?: string;
    message_id?: string;
    user_message_id?: string;
    message?: string;
    context_docs?: ContextDocument;
    citations?: Object;
}

export function createChatSession(persona_id: number, fastapiusersauth: string | null, description: string | null = null): Promise<string> {
    const forwardServerUrl = process.env.NEXT_PUBLIC_FORWARD_SERVER_URL;
    const requestBody = {
        persona_id,
        description,
        fastapiusersauth
    };

    return new Promise<string>((resolve, reject) => {
        fetch(`${forwardServerUrl}/api/chat/create-chat-session`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(requestBody),
        })
        .then(response => {
            if (!response.ok) {
                throw new Error('Network response was not ok');
            }
            return response.json();
        })
        .then((data: ChatSessionResponse) => {
            if (data && data.chat_session_id) {
                resolve(data.chat_session_id);
            } else {
                throw new Error('Chat session ID not received');
            }
        })
        .catch(error => {
            console.error('Error creating chat session:', error);
            reject(error);
        });
    });
}

export async function simpleSendMessage(
    paramObj: SendMessageParams, 
    dataCallback: (data: SendMessageResponse) => void,
    onEnd: () => void,
    onError: (error: any) => void
) {
    try {
        console.log('Sending message:', paramObj.message);
        const controller = new AbortController();
        for await (const packet of sendMessage(paramObj, controller.signal)) {
          if (controller.signal?.aborted) {
            throw new Error("AbortError");
          }
          dataCallback(packet as SendMessageResponse);
        }
      } catch (error: unknown) {
        if (error instanceof Error) {
          if (error.name === "AbortError") {
            console.debug("Stream aborted");
          } else {
            console.error("Stream error:", error);
          }
        } else {
            console.error("Stream error:", error);
        }
      } finally {
        onEnd();
      }
}

export async function* sendMessage(
    paramObj: SendMessageParams,
    signal: AbortSignal
): AsyncGenerator<PacketType, void, unknown> {

    const reqData = {
        alternate_assistant_id: 1,
        chat_session_id: paramObj.chat_session_id,
        message: paramObj.message,
        parent_message_id: paramObj.parent_message_id,
        prompt_id: paramObj.prompt_id,
        search_doc_ids: null,
        file_descriptors: [],
        regenerate: false,
        retrieval_options: {
            run_search: "auto",
            real_time: true,
            filters: {
                source_type: null,
                document_set: null,
                time_cutoff: null,
                tags: []
            }
        },
        prompt_override: null,
        llm_override: null,
        temperature: paramObj.temperature
    }

    const postData = JSON.stringify({
        postData: reqData,
        fastapiusersauth: paramObj.fastapiusersauth
    });

    const forwardServerUrl = process.env.NEXT_PUBLIC_FORWARD_SERVER_URL;

    const response = await fetch(`${forwardServerUrl}/api/chat/send-message`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: postData,
        signal
      });
    
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
    
    yield* handleSSEStream<PacketType>(response);
}

export async function getFastApiAuthToken(isAuthEnabled: boolean): Promise<string | null> {
    if (!isAuthEnabled) {
        return null;
    }
    const forwardServerUrl = process.env.NEXT_PUBLIC_FORWARD_SERVER_URL;

    try {
        const response = await fetch(`${forwardServerUrl}/api/get-auth-token`).then(data => data.json());
        const token = response.token;

        if (!token) {
            throw new Error('Failed to fetch the auth token');
        }

        return token;
    } catch (error) {
        console.error('Error fetching auth token:', error);
        return null;
    }
}