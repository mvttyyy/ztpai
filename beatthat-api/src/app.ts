import express, { type NextFunction, type Request, type Response } from "express";
import morgan from "morgan";
import createHttpError, { HttpError } from "http-errors";
import { LoopsController } from "./controllers/loops.controller";

export function createApp() {
  const app = express();

  app.disable("x-powered-by");
  app.use(express.json());
  app.use(morgan("dev"));

  const loopsController = new LoopsController();
  app.use("/api/loops", loopsController.router);

  app.use((_req: Request, _res: Response, next: NextFunction) => {
    next(createHttpError(404, {
      message: "Route not found",
      code: "ROUTE_NOT_FOUND"
    }));
  });

  app.use((err: unknown, req: Request, res: Response, _next: NextFunction) => {
    if (res.headersSent) {
      return;
    }

    const status = resolveStatus(err);
    const payload = resolvePayload(err, status, req.path);
    res.status(status).json(payload);
  });

  return app;
}

function resolveStatus(err: unknown): number {
  if (isHttpError(err)) {
    return err.status ?? err.statusCode ?? 500;
  }

  return 500;
}

function resolvePayload(err: unknown, status: number, path: string) {
  if (isHttpError(err)) {
    const { message, code } = err as HttpError & { code?: string };
    return {
      status,
      error: code ?? "HTTP_ERROR",
      message,
      path
    };
  }

  return {
    status,
    error: "INTERNAL_SERVER_ERROR",
    message: "Unexpected error",
    path
  };
}

function isHttpError(err: unknown): err is HttpError {
  return Boolean(err) && typeof err === "object" && "status" in (err as HttpError);
}
