import http from "http";
import { ExpressEndPoint, Method } from "../../types";
import { EnvVars, getEnvVar } from "../../utils/envVars";

export const sendMessageEndpoint: ExpressEndPoint = {
    method: Method.POST,
    path: "/api/chat/send-message",
    handler: (req, res) => {
        console.log(req.body);
        const danswerHost = getEnvVar(EnvVars.DANSWER_HOST);
        const danswerPort = getEnvVar(EnvVars.DANSWER_PORT);
        const danswerUrl = getEnvVar(EnvVars.DANSWER_URL);
        const clientUrl = getEnvVar(EnvVars.CLIENT_URL);

        if (danswerHost.isNothing || danswerPort.isNothing || danswerUrl.isNothing || clientUrl.isNothing) {
            console.error("Error: DANSWER_HOST, DANSWER_PORT, DANSWER_URL or CLIENT_URL not set");
            return res.status(500).json({ error: "DANSWER_HOST, DANSWER_PORT, DANSWER_URL or CLIENT_URL not set" });
        }
        
        const postData = JSON.stringify(req.body.postData);
        const options = {
            hostname: danswerHost.value,
            port: danswerPort.value,
            path: "/api/chat/send-message",
            timeout: 30000,
            method: "POST",
            headers: {
                Accept: "*/*",
                "Cache-Control": "no-cache",
                Connection: "keep-alive",
                "Content-Type": "application/json",
                Cookie: `fastapiusersauth=${req.body.fastapiusersauth}; documentSidebarWidth=-143`,
                Origin: danswerUrl.value,
                Pragma: "no-cache",
                Referer: `${danswerUrl.value}/chat`
            },
        };

        console.log(options);

        const proxyRequest = http.request(options, (proxyResponse) => {
            console.log(proxyResponse.headers);
            const headers = {
                ...proxyResponse.headers,
                "access-control-allow-origin": clientUrl.value,
            };
            res.writeHead(proxyResponse.statusCode || 200, headers);

            proxyResponse.on("data", (chunk) => {
                console.log("Received chunk", chunk.toString());
                res.write(chunk);
            });

            proxyResponse.on("end", () => {
                console.log("No more data in response.");
                res.end();
            });

            proxyResponse.on("error", (err) => {
                console.error("Error with proxy response:", err);
                if (!res.headersSent) {
                    res.status(500).send("Error streaming response from target API");
                } else {
                    res.end();
                }
            });
        });

        proxyRequest.on("error", (err: NodeJS.ErrnoException) => {
            console.error("Error sending request to target API:", err);
            if (!res.headersSent) {
                if (err.code === "ECONNRESET") {
                    res.status(500).send("Connection reset by target API");
                } else {
                    res.status(500).send("Error sending request to target API");
                }
            } else {
                res.end();
            }
        });

        console.log(postData);
        proxyRequest.write(postData);
        proxyRequest.end();
    },
};