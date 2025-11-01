import type { NextFunction, Request, Response } from "express";
import { Router } from "express";
import createHttpError from "http-errors";
import { LoopService } from "../services/loop.service";

export class LoopsController {
  public readonly router = Router();

  constructor(private readonly service = new LoopService()) {
    this.router.get("/", this.handleGetLoops);
    this.router.get("/:id", this.handleGetLoopById);
  }

  private handleGetLoops = (_req: Request, res: Response): void => {
    const data = this.service.findAll();
    res.status(200).json({ items: data, total: data.length });
  };

  private handleGetLoopById = (
    req: Request,
    res: Response,
    next: NextFunction
  ): void => {
    const rawId = req.params.id;

    if (!/^\d+$/.test(rawId)) {
      return next(createHttpError(400, {
        message: "Loop identifier must be numeric",
        code: "INVALID_LOOP_ID"
      }));
    }

    const loopId = Number.parseInt(rawId, 10);
    const loop = this.service.findById(loopId);

    if (!loop) {
      return next(createHttpError(404, {
        message: "Loop not found",
        code: "LOOP_NOT_FOUND"
      }));
    }

    res.status(200).json(loop);
  };
}
