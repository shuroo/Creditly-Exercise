import { v4 as uuid } from "uuid";
import { MongoRepository } from "../repositories/MongoRepository.js";

export class CrudService<T extends { id: string }> {
  constructor(private repository: MongoRepository<T>) {}

  findAll(): Promise<T[]> {
    return this.repository.findAll();
  }

  async findById(id: string): Promise<T> {
    const item = await this.repository.findById(id);

    if (!item) {
      throw new Error("Entity not found");
    }

    return item;
  }

  create(data: Omit<T, "id">): Promise<T> {
    const item = {
      id: uuid(),
      ...data
    } as T;

    return this.repository.create(item);
  }

  async update(id: string, data: Partial<T>): Promise<T> {
    const existing = await this.findById(id);

    const updated = {
      ...existing,
      ...data,
      id
    };

    const updatedItem = await this.repository.update(id, updated);
    return updatedItem!;
  }

  async delete(id: string): Promise<void> {
    const deleted = await this.repository.delete(id);

    if (!deleted) {
      throw new Error("Entity not found");
    }
  }
}
