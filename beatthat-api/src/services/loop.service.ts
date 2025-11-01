import type { Loop } from "../types";
import { loops } from "../data/loops";

export class LoopService {
  #loops: Loop[];

  constructor(seed: Loop[] = loops) {
    this.#loops = seed;
  }

  findAll(): Loop[] {
    return this.#loops;
  }
}
