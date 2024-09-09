import { RequestHandler } from "express";
import { ExpressEndPoint, Method } from "../types";
import { EnvVars, getEnvVar } from "../utils/envVars";

const authHandler: RequestHandler = async (req, res) => {
    try {
        const username = getEnvVar(EnvVars.SERVICE_ACCOUNT_USERNAME);
        const password = getEnvVar(EnvVars.SERVICE_ACCOUNT_PASSWORD);

        if (username.isNothing || password.isNothing) {
            console.error("Error: SERVICE_ACCOUNT_USERNAME or SERVICE_ACCOUNT_PASSWORD not set");
            return res.status(500).json({ error: "SERVICE_ACCOUNT_USERNAME or SERVICE_ACCOUNT_PASSWORD not set" });
        }

        // Encode the username and password to ensure proper URL formatting
        const encodedUsername = encodeURIComponent(username.value);
        const encodedPassword = encodeURIComponent(password.value);
        const response = await fetch(`${process.env.NEXT_PUBLIC_DANSWER_URL}/api/auth/login`, {
            headers: {
                "content-type": "application/x-www-form-urlencoded"
            },
            body: `username=${encodedUsername}&password=${encodedPassword}`,
            method: "POST",
            mode: "cors",
            credentials: "include"
        });

        if (!response.ok) {
            throw new Error("Failed to fetch the auth token");
        }

        // Extract the token from the 'Set-Cookie' header
        const setCookieHeader = response.headers.get("set-cookie");
        if (!setCookieHeader) {
            console.error("Auth token not found in response headers", response.headers);
            throw new Error("Auth token not found in response headers");
        }

        const tokenMatch = setCookieHeader.match(/fastapiusersauth=([^;]+);/);
        if (!tokenMatch) {
            console.error("Auth token format is incorrect or missing", setCookieHeader);
            return res.status(500).json({ error: "Auth token format is incorrect or missing" });
        }

        console.log(tokenMatch);

        res.status(200).json({ token: tokenMatch[1] }); // Return the token part of the cookie
    } catch (error) {
        console.error("Error fetching auth token:", error);
        res.status(500).json({ error: "Internal Server Error" });
    }
};

export const getAuthTokenEndpoint: ExpressEndPoint = {
    method: Method.GET,
    path: "/api/get-auth-token",
    handler: authHandler
};
