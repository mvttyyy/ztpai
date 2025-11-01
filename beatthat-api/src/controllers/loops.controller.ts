import type { Request, Response } from "express";
import { Router } from "express";
import { LoopService } from "../services/loop.service";

export class LoopsController {
  public readonly router = Router();

  constructor(private readonly service = new LoopService()) {
    this.router.get("/", this.handleGetLoops);
  }

  private handleGetLoops = (_req: Request, res: Response): void => {
    const data = this.service.findAll();
    res.status(200).json({ items: data, total: data.length });
  };
}
