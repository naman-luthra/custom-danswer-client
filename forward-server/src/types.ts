import { RequestHandler } from "express";

export enum Method {
    GET = "get",
    POST = "post",
    PUT = "put",
    DELETE = "delete"
}
export type ExpressEndPoint = {
    method: Method;
    path: string;
    handler: RequestHandler;
};