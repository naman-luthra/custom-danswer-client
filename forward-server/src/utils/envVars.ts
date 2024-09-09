import dotenv from 'dotenv';
import Maybe from 'true-myth/maybe';

dotenv.config();

export enum EnvVars {
    PORT = 'PORT',
    DANSWER_URL = 'DANSWER_URL',
    DANSWER_HOST = 'DANSWER_HOST',
    DANSWER_PORT = 'DANSWER_PORT',
    DANSWER_PROTOCOL = 'DANSWER_PROTOCOL',
    CLIENT_URL = 'CLIENT_URL',
    SERVICE_ACCOUNT_USERNAME = 'SERVICE_ACCOUNT_USERNAME',
    SERVICE_ACCOUNT_PASSWORD = 'SERVICE_ACCOUNT_PASSWORD'
}

export function getEnvVar(envVar: EnvVars): Maybe<string> {
    const envVarValue = Maybe.of(process.env[envVar]);
    return envVarValue;
}