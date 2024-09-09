import express from 'express';
import bodyParser from 'body-parser';
import cors from 'cors';
import { EnvVars, getEnvVar } from './utils/envVars';
import { unwrapOr } from 'true-myth/maybe';
import { endpoints } from './endpoints';

const app = express();

app.use(bodyParser.json({
    limit: '50mb'
}));

app.use(cors({
    origin: '*'
}));

const portEnv = getEnvVar(EnvVars.PORT);
const PORT = unwrapOr('8080', portEnv);

endpoints.forEach(({ method, path, handler }) => {
    app[method](path, handler);
})

app.post('/api/get-auth-token', (req, res) => {});

app.listen(PORT, () => {
    console.log(`Server is listening on port ${PORT}!`);
});