import { v4 as uuid } from "uuid";
import { InMemoryRepository } from "../repositories/InMemoryRepository.js";

export class CrudService<T extends { id: string }> {
  constructor(private repository: InMemoryRepository<T>) {}

  findAll(): T[] {
    return this.repository.findAll();
  }

  findById(id: string): T {
    const item = this.repository.findById(id);

    if (!item) {
      throw new Error("Entity not found");
    }

    return item;
  }

  create(data: Omit<T, "id">): T {
    const item = {
      id: uuid(),
      ...data
    } as T;

    return this.repository.create(item);
  }

  update(id: string, data: Partial<T>): T {
    const existing = this.findById(id);

    const updated = {
      ...existing,
      ...data,
      id
    };

    return this.repository.update(id, updated)!;
  }

  delete(id: string): void {
    const deleted = this.repository.delete(id);

    if (!deleted) {
      throw new Error("Entity not found");
    }
  }
}