// MongoRepository.ts
import { Collection } from "mongodb";

export class MongoRepository<T extends { id?: string }> {
  constructor(private collection: Collection<T>) {}

  async findAll(): Promise<T[]> {
    return this.collection.find({}).toArray() as Promise<T[]>;
  }

  async findById(id: string): Promise<T | null> {
    return this.collection.findOne({ id } as any) as Promise<T | null>;
  }

  async create(item: T): Promise<T> {
    await this.collection.insertOne(item as any);
    return item;
  }

  async update(id: string, item: Partial<T>): Promise<T | null> {
    await this.collection.findOneAndUpdate(
      { id } as any,
      { $set: item }
    );

    return this.findById(id);
  }

  async delete(id: string): Promise<boolean> {
    const result = await this.collection.deleteOne({ id } as any);

    return result.deletedCount > 0;
  }
}
