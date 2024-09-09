import { ExpressEndPoint, Method } from "../../types";
import { EnvVars, getEnvVar } from "../../utils/envVars";

export const createChatSessionEndpoint: ExpressEndPoint = {
    method: Method.POST,
    path: '/api/chat/create-chat-session',
    handler: async (req, res) => {
      const danswerUrl = getEnvVar(EnvVars.DANSWER_URL);

      if(danswerUrl.isNothing) {
        console.error('Error: DANSWER_URL not set');
        return res.status(500).json({ error: 'DANSWER_URL not set' });
      }

      const url = `${danswerUrl.value}/api/chat/create-chat-session`;
      const { persona_id, description, fastapiusersauth } = req.body;
  
      try {
        console.log('Creating chat session...', process.env.NEXT_PUBLIC_DANSWER_URL);
        console.log('URL:', url);
  
        const response = await fetch(url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Cookie': `fastapiusersauth=${fastapiusersauth}`
          },
          body: JSON.stringify({ persona_id, description })
        });
  
        if (!response.ok) {
          throw new Error('Failed to create chat session');
        }
  
        const data = await response.json() as { chat_session_id: string };
        if (data && data.chat_session_id) {
          res.status(200).json({ chat_session_id: data.chat_session_id });
        } else {
          throw new Error('Chat session ID not received');
        }
      } catch (error: any) {
        console.error('Error:', error);
        res.status(500).json({ error: error.message || 'Unknown error' });
      }
    },
  };